import "dotenv/config";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";
import { Resend } from "resend";
import twilio from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const maskEmail = (email = "") => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "email";
  const safeUser = user.length <= 2 ? `${user[0]}*` : `${user[0]}${"*".repeat(user.length - 2)}${user[user.length - 1]}`;
  return `${safeUser}@${domain}`;
};

const maskPhone = (phone = "") => {
  const trimmed = phone.replace(/\D/g, "");
  if (trimmed.length < 4) return "mobile number";
  const last4 = trimmed.slice(-4);
  return `******${last4}`;
};

const sendEmailOtp = async (email, code) => {
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error("RESEND_FROM is missing");
  await resend.emails.send({
    from,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`
  });
};

const sendSmsOtp = async (phone, code) => {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) throw new Error("TWILIO_FROM_NUMBER is missing");
  await twilioClient.messages.create({
    from,
    to: phone,
    body: `Your OTP code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`
  });
};


export const otpRoutingMiddleware = (req, res, next) => {
  const { state } = req.body || {};
  const southIndiaStates = [
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana"
  ];
  const authMethod = southIndiaStates.includes(state) ? "EMAIL_OTP" : "MOBILE_OTP";
  req.authMethod = authMethod;
  next();
};

export const login = async (req, res) => {
  const { email, name, image, state } = req.body;
  try {
    let existinguser = await users.findOne({ email: email });
    
    
    const southIndiaStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const authMethod = req.authMethod || (southIndiaStates.includes(state) ? "EMAIL_OTP" : "MOBILE_OTP");
    
    console.log(`User logging in from ${state || 'Unknown'}. Routing to ${authMethod}.`);

    if (!existinguser) {
      try {
        existinguser = await users.create({ email, name, image });
      } catch (err) {
        res.status(500).json({ message: "Failed to create user", error: err.message });
        return;
      }
    }

    existinguser.otpMethod = authMethod;

    if (authMethod === "MOBILE_OTP" && !existinguser.phone) {
      await existinguser.save();
      return res.status(200).json({
        needsPhone: true,
        userId: existinguser._id,
        otpMethod: authMethod
      });
    }

    const now = new Date();
    const hasValidOtp =
      existinguser.otpCode &&
      existinguser.otpExpiresAt &&
      now < new Date(existinguser.otpExpiresAt);
    const lastSentAt = existinguser.otpLastSentAt ? new Date(existinguser.otpLastSentAt) : null;
    const canResend = !lastSentAt || now.getTime() - lastSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;

    if (!hasValidOtp) {
      const code = generateOtp();
      existinguser.otpCode = code;
      existinguser.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      existinguser.otpLastSentAt = now;
      await existinguser.save();

      if (authMethod === "EMAIL_OTP") {
        await sendEmailOtp(existinguser.email, code);
      } else {
        await sendSmsOtp(existinguser.phone, code);
      }
    } else if (!canResend) {
      return res.status(200).json({
        otpRequired: true,
        userId: existinguser._id,
        otpMethod: authMethod,
        otpTarget: authMethod === "EMAIL_OTP" ? maskEmail(existinguser.email) : maskPhone(existinguser.phone),
        authMessage: `Please wait before requesting another OTP.`
      });
    }

    res.status(200).json({
      otpRequired: true,
      userId: existinguser._id,
      otpMethod: authMethod,
      otpTarget: authMethod === "EMAIL_OTP" ? maskEmail(existinguser.email) : maskPhone(existinguser.phone),
      authMessage: hasValidOtp
        ? `OTP already sent. Please check your ${authMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
        : `Verification code sent to your ${authMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
    });
  } catch (err) {
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
};

export const updatePhone = async (req, res) => {
  const { id: _id } = req.params;
  const { phone } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (!phone) {
    return res.status(400).json({ message: "Phone is required" });
  }
  try {
    const updated = await users.findByIdAndUpdate(
      _id,
      { $set: { phone } },
      { new: true }
    );
    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update phone", error: error.message });
  }
};

export const requestOtp = async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const authMethod = user.otpMethod || "EMAIL_OTP";
    if (authMethod === "MOBILE_OTP" && !user.phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const now = new Date();
    const hasValidOtp =
      user.otpCode &&
      user.otpExpiresAt &&
      now < new Date(user.otpExpiresAt);
    const lastSentAt = user.otpLastSentAt ? new Date(user.otpLastSentAt) : null;
    const canResend = !lastSentAt || now.getTime() - lastSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;

    if (!hasValidOtp) {
      const code = generateOtp();
      user.otpCode = code;
      user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      user.otpLastSentAt = now;
      await user.save();

      if (authMethod === "EMAIL_OTP") {
        await sendEmailOtp(user.email, code);
      } else {
        await sendSmsOtp(user.phone, code);
      }
    } else if (!canResend) {
      return res.status(200).json({
        otpRequired: true,
        userId: user._id,
        otpMethod: authMethod,
        otpTarget: authMethod === "EMAIL_OTP" ? maskEmail(user.email) : maskPhone(user.phone),
        authMessage: `Please wait before requesting another OTP.`
      });
    }

    res.status(200).json({
      otpRequired: true,
      userId: user._id,
      otpMethod: authMethod,
      otpTarget: authMethod === "EMAIL_OTP" ? maskEmail(user.email) : maskPhone(user.phone),
      authMessage: hasValidOtp
        ? `OTP already sent. Please check your ${authMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
        : `Verification code sent to your ${authMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, code } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (!code) {
    return res.status(400).json({ message: "OTP code is required" });
  }
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    const now = new Date();
    const authMethod = user.otpMethod || "EMAIL_OTP";
    const lastSentAt = user.otpLastSentAt ? new Date(user.otpLastSentAt) : null;
    const canResend = !lastSentAt || now.getTime() - lastSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;

    if (new Date() > new Date(user.otpExpiresAt)) {
      if (!canResend) {
        return res.status(400).json({ message: "OTP expired. Please wait before requesting another OTP." });
      }
      const newCode = generateOtp();
      user.otpCode = newCode;
      user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      user.otpLastSentAt = now;
      await user.save();
      if (authMethod === "EMAIL_OTP") {
        await sendEmailOtp(user.email, newCode);
      } else {
        await sendSmsOtp(user.phone, newCode);
      }
      return res.status(400).json({ message: "OTP expired. A new OTP has been sent." });
    }

    if (String(user.otpCode) !== String(code)) {
      if (!canResend) {
        return res.status(400).json({ message: "Invalid OTP. Please wait before requesting another OTP." });
      }
      const newCode = generateOtp();
      user.otpCode = newCode;
      user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      user.otpLastSentAt = now;
      await user.save();
      if (authMethod === "EMAIL_OTP") {
        await sendEmailOtp(user.email, newCode);
      } else {
        await sendSmsOtp(user.phone, newCode);
      }
      return res.status(400).json({ message: "Invalid OTP. A new OTP has been sent." });
    }

    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ success: true, result: user });
  } catch (error) {
    res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname: channelname, description: description } },
      { new: true }
    );
    return res.status(200).json(updatedata);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};


export const trackDownload = async (req, res) => {
  const { userId, videoId, title } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    
    user.checkResetDailyDownloads();

    
    if (user.plan === 'Free' && user.downloadsToday >= 1) {
      return res.status(403).json({
        allowed: false,
        message: "Daily download limit reached. Upgrade to Premium for unlimited downloads."
      });
    }

    
    user.downloadsToday += 1;
    
    user.lastDownloadDate = new Date();

    user.downloadHistory.push({
      videoId,
      title,
      downloadedAt: new Date()
    });

    await user.save();

    return res.status(200).json({
      allowed: true,
      downloadsToday: user.downloadsToday,
      message: "Download started"
    });

  } catch (error) {
    console.error("Download tracking error:", error);
    return res.status(500).json({ message: "Error tracking download" });
  }
};


export const getDownloadHistory = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    
    const user = await users.findById(id).populate({
      path: "downloadHistory.videoId",
      model: "videofiles"
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    
    const history = user.downloadHistory.sort((a, b) =>
      new Date(b.downloadedAt) - new Date(a.downloadedAt)
    );

    res.status(200).json(history);
  } catch (error) {
    console.error("Get download history error:", error);
    res.status(500).json({ message: "Error fetching download history" });
  }
};


export const getUserStatus = async (req, res) => {
  const { id } = req.params;

  console.log(`🔍 Checking status for user: ${id}`); 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const user = await users.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    
    const wasReset = user.checkResetDailyDownloads();
    if (wasReset) {
      await user.save();
      console.log(`🔄 Daily limits reset for user ${id}`); 
    }

    
    const timeLimits = {
      'FREE': 5,      
      'BRONZE': 7,    
      'SILVER': 10,   
      'GOLD': -1      
    };

    const userPlan = user.plan ? user.plan.toUpperCase() : 'FREE';
    const limit = timeLimits[userPlan] || 5;

    console.log(`👤 User Plan: ${userPlan}, Limit: ${limit} mins`); 

    res.status(200).json({
      plan: userPlan,
      downloadsToday: user.downloadsToday,
      watchTimeLimit: limit
    });
  } catch (error) {
    console.error("❌ Status fetch error:", error);
    res.status(500).json({ message: "Error fetching status" });
  }
};


export const upgradeToPremium = async (req, res) => {
  const { userId, plan } = req.body;

  try {
    const user = await users.findByIdAndUpdate(
      userId,
      { plan },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch {
    res.status(500).json({ message: "Upgrade failed" });
  }
};
