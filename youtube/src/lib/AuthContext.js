import { createContext, useState, useEffect, useContext } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth, provider } from "./firebase.js";
import axiosInstance from "./axiosinstance";
import { isSouthIndia, isWithinTimeRange } from "./geoUtils";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [locationData, setLocationData] = useState(null);
  const [otpFlow, setOtpFlow] = useState({
    isOpen: false,
    step: null, 
    userId: null,
    method: null,
    target: null
  });
  const [otpLoading, setOtpLoading] = useState(false);
  const OTP_BLOCK_MS = 10 * 60 * 1000;

  const isOtpBlocked = () => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem("otp_block_until");
    const until = raw ? Number(raw) : 0;
    return until > Date.now();
  };

  const setOtpBlock = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("otp_block_until", String(Date.now() + OTP_BLOCK_MS));
  };

  const clearOtpBlock = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("otp_block_until");
  };

  const applyThemeForState = (stateName) => {
    const isSouth = isSouthIndia(stateName || "");
    const isTimeMatch = isWithinTimeRange();
    setTheme((isSouth && isTimeMatch) ? 'light' : 'dark');
  };

  useEffect(() => {
    const initContext = async () => {
      let region = "Unknown";
      try {
        const res = await fetch("https://ipapi.co/json/").catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setLocationData(data);
          region = data.region || "Unknown";
        }
      } catch (err) {
        console.error("Could not fetch location", err);
      }

      applyThemeForState(region);
    };
    initContext();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          console.log("Error parsing stored user:", err);
          localStorage.removeItem("user");
        }
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    console.log("Login function called with:", userData);
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("User saved to localStorage");
    }
    clearOtpBlock();
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("user");
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  const handleAuthStateChange = async () => {
    console.log("Starting authentication process...");
    try {
      if (isOtpBlocked()) {
        console.log("OTP flow blocked to prevent spam.");
        return;
      }
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      console.log("Firebase user signed in:", firebaseuser);

      const region = locationData?.region || "Unknown";
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        state: region
      };
      console.log("Sending payload to backend:", payload);

      const response = await axiosInstance.post("/user/login", payload);
      console.log("Backend response:", response.data);
      if (response.data?.needsPhone) {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem("user");
        }
        setOtpBlock();
        setOtpFlow({
          isOpen: true,
          step: "phone",
          userId: response.data.userId,
          method: response.data.otpMethod,
          target: null
        });
        toast.info("Please add your phone number to receive OTP.");
        return;
      }

      if (response.data?.otpRequired) {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem("user");
        }
        setOtpBlock();
        setOtpFlow({
          isOpen: true,
          step: "otp",
          userId: response.data.userId,
          method: response.data.otpMethod,
          target: response.data.otpTarget || null
        });
        if (response.data?.authMessage) toast.success(response.data.authMessage);
        return;
      }

      login(response.data.result);
      applyThemeForState(region);
      if (response.data?.authMessage) toast.success(response.data.authMessage);
      console.log("User logged in successfully");
    } catch (err) {
      console.log("Authentication error:", err);
    }
  };

  useEffect(() => {
    console.log("AuthContext useEffect mounted");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      console.log("Firebase auth state changed:", firebaseuser);
      if (firebaseuser) {
        try {
          if (isOtpBlocked()) {
            console.log("OTP flow blocked to prevent spam.");
            return;
          }
          const region = locationData?.region || "Unknown";
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            state: region
          };
          console.log("Auto-login payload:", payload);

          const response = await axiosInstance.post("/user/login", payload);
          console.log("Auto-login backend response:", response.data);
          if (response.data?.otpRequired || response.data?.needsPhone) {
            setUser(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem("user");
            }
            setOtpBlock();
            
            return;
          }
          login(response.data.result);
          applyThemeForState(region);
        } catch (err) {
          console.log("Auto-authentication error:", err);
          logout();
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem("user");
        }
      }
    });

    return () => unsubscribe();
  }, [locationData]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        theme,
        locationData,
        login,
        logout,
        handleAuthStateChange,
        otpFlow,
        otpLoading,
        submitPhone: async (phone) => {
          if (!otpFlow.userId) return;
          setOtpLoading(true);
          try {
            await axiosInstance.patch(`/user/phone/${otpFlow.userId}`, { phone });
            const res = await axiosInstance.post("/user/request-otp", { userId: otpFlow.userId });
            setOtpFlow({
              isOpen: true,
              step: "otp",
              userId: res.data.userId,
              method: res.data.otpMethod,
              target: res.data.otpTarget || null
            });
            if (res.data?.authMessage) toast.success(res.data.authMessage);
          } catch (err) {
            console.log("Phone update/OTP error:", err);
            toast.error("Failed to send OTP.");
          } finally {
            setOtpLoading(false);
          }
        },
        verifyOtp: async (code) => {
          if (!otpFlow.userId) return;
          setOtpLoading(true);
          try {
            const res = await axiosInstance.post("/user/verify-otp", {
              userId: otpFlow.userId,
              code
            });
            login(res.data.result);
            setOtpFlow({ isOpen: false, step: null, userId: null, method: null, target: null });
            toast.success("OTP verified. Logged in.");
          } catch (err) {
            console.log("OTP verify error:", err);
            toast.error("Invalid or expired OTP.");
          } finally {
            setOtpLoading(false);
          }
        },
        resendOtp: async () => {
          if (!otpFlow.userId) return;
          setOtpLoading(true);
          try {
            const res = await axiosInstance.post("/user/request-otp", { userId: otpFlow.userId });
            setOtpFlow({
              isOpen: true,
              step: "otp",
              userId: res.data.userId,
              method: res.data.otpMethod,
              target: res.data.otpTarget || null
            });
            if (res.data?.authMessage) toast.success(res.data.authMessage);
          } catch (err) {
            console.log("Resend OTP error:", err);
            toast.error("Failed to resend OTP.");
          } finally {
            setOtpLoading(false);
          }
        },
        switchToEmailOtp: async () => {
          if (!otpFlow.userId) return;
          setOtpLoading(true);
          try {
            const res = await axiosInstance.post("/user/request-otp", {
              userId: otpFlow.userId,
              method: "EMAIL_OTP"
            });
            setOtpFlow({
              isOpen: true,
              step: "otp",
              userId: res.data.userId,
              method: res.data.otpMethod,
              target: res.data.otpTarget || null
            });
            toast.success(res.data?.authMessage || "Switched to email OTP.");
          } catch (err) {
            console.log("Switch to email OTP error:", err);
            toast.error("Failed to switch to email OTP.");
          } finally {
            setOtpLoading(false);
          }
        },
        closeOtp: () => setOtpFlow({ isOpen: false, step: null, userId: null, method: null, target: null })
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
