import "dotenv/config";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";
import { Resend } from "resend";
import twilio from "twilio";
import nodemailer from "nodemailer";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const smtpTransporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      })
    : null;

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MS = 10 * 60 * 1000;
const OTP_REVERIFY_DAYS = 30;

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
  const resendFrom = process.env.RESEND_FROM;
  const text = `Your OTP code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`;

  if (resend && resendFrom) {
    try {
      const response = await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: "Your OTP Code",
        text
      });

      if (response?.error) {
        throw new Error(response.error.message || "Unknown Resend API error");
      }

      const resendId = response?.data?.id || response?.id || "unknown-id";
      console.log("OTP email accepted by Resend. id:", resendId);
      return;
    } catch (error) {
      console.error("Resend OTP send failed:", error.message);
    }
  }

  if (smtpTransporter) {
    const info = await smtpTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text
    });
    console.log("OTP email sent via SMTP:", info.response || info.messageId);
    return;
  }

  throw new Error("No email provider configured. Set RESEND_API_KEY+RESEND_FROM or EMAIL_USER+EMAIL_PASS.");
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

const deliverOtp = async (user, code, preferredMethod, emailTarget) => {
  const method = preferredMethod === "MOBILE_OTP" ? "MOBILE_OTP" : "EMAIL_OTP";
  const targetEmail = emailTarget || user.email;

  if (method === "MOBILE_OTP") {
    try {
      await sendSmsOtp(user.phone, code);
      return { method: "MOBILE_OTP", fellBackToEmail: false };
    } catch (error) {
      // Twilio trial can fail for unverified numbers; fallback to email OTP.
      console.error("SMS OTP failed, falling back to email OTP:", error.message);
      await sendEmailOtp(targetEmail, code);
      user.otpMethod = "EMAIL_OTP";
      await user.save();
      return { method: "EMAIL_OTP", fellBackToEmail: true };
    }
  }

  await sendEmailOtp(targetEmail, code);
  if (user.otpMethod !== "EMAIL_OTP") {
    user.otpMethod = "EMAIL_OTP";
    await user.save();
  }
  return { method: "EMAIL_OTP", fellBackToEmail: false };
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

    const now = new Date();
    if (existinguser.otpVerifiedAt) {
      const msSinceVerify = now.getTime() - new Date(existinguser.otpVerifiedAt).getTime();
      const reverifyMs = OTP_REVERIFY_DAYS * 24 * 60 * 60 * 1000;
      if (msSinceVerify < reverifyMs) {
        await existinguser.save();
        return res.status(200).json({
          result: existinguser,
          authMessage: "Signed in."
        });
      }
    }

    if (authMethod === "MOBILE_OTP" && !existinguser.phone) {
      await existinguser.save();
      return res.status(200).json({
        needsPhone: true,
        userId: existinguser._id,
        otpMethod: authMethod
      });
    }

    const hasValidOtp =
      existinguser.otpCode &&
      existinguser.otpExpiresAt &&
      now < new Date(existinguser.otpExpiresAt);
    const lastSentAt = existinguser.otpLastSentAt ? new Date(existinguser.otpLastSentAt) : null;
    const canResend = !lastSentAt || now.getTime() - lastSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;

    let deliveryMethod = authMethod;
    let fellBackToEmail = false;

    if (!hasValidOtp) {
      const code = generateOtp();
      existinguser.otpCode = code;
      existinguser.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      existinguser.otpLastSentAt = now;
      await existinguser.save();
      const result = await deliverOtp(existinguser, code, authMethod);
      deliveryMethod = result.method;
      fellBackToEmail = result.fellBackToEmail;
    } else if (!canResend) {
      return res.status(200).json({
        otpRequired: true,
        userId: existinguser._id,
        otpMethod: existinguser.otpMethod || authMethod,
        otpTarget: (existinguser.otpMethod || authMethod) === "EMAIL_OTP" ? maskEmail(existinguser.email) : maskPhone(existinguser.phone),
        authMessage: `Please wait before requesting another OTP.`
      });
    }

    res.status(200).json({
      otpRequired: true,
      userId: existinguser._id,
      otpMethod: hasValidOtp ? (existinguser.otpMethod || authMethod) : deliveryMethod,
      otpTarget: (hasValidOtp ? (existinguser.otpMethod || authMethod) : deliveryMethod) === "EMAIL_OTP"
        ? maskEmail(existinguser.email)
        : maskPhone(existinguser.phone),
      authMessage: hasValidOtp
        ? `OTP already sent. Please check your ${(existinguser.otpMethod || authMethod) === "EMAIL_OTP" ? "email" : "mobile number"}.`
        : fellBackToEmail
          ? "SMS OTP unavailable in trial mode. Verification code sent to your email."
          : `Verification code sent to your ${deliveryMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
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
  const { userId, method, email } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const requestedMethod = method === "MOBILE_OTP" || method === "EMAIL_OTP" ? method : null;
    if (requestedMethod && requestedMethod !== user.otpMethod) {
      user.otpMethod = requestedMethod;
      await user.save();
    }

    const authMethod = user.otpMethod || "EMAIL_OTP";
    const requestedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const useCustomEmail = authMethod === "EMAIL_OTP" && requestedEmail.length > 0;
    const emailTarget = useCustomEmail ? requestedEmail : user.email;

    if (useCustomEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(requestedEmail)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
    }

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

    let deliveryMethod = authMethod;
    let fellBackToEmail = false;

    if (!hasValidOtp) {
      const code = generateOtp();
      user.otpCode = code;
      user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      user.otpLastSentAt = now;
      await user.save();
      const result = await deliverOtp(user, code, authMethod, emailTarget);
      deliveryMethod = result.method;
      fellBackToEmail = result.fellBackToEmail;
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
      otpMethod: deliveryMethod,
      otpTarget: deliveryMethod === "EMAIL_OTP" ? maskEmail(emailTarget) : maskPhone(user.phone),
      authMessage: hasValidOtp
        ? `OTP already sent. Please check your ${deliveryMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
        : fellBackToEmail
          ? "SMS OTP unavailable in trial mode. Verification code sent to your email."
          : `Verification code sent to your ${deliveryMethod === "EMAIL_OTP" ? "email" : "mobile number"}.`
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
      const result = await deliverOtp(user, newCode, authMethod);
      return res.status(400).json({
        message: result.fellBackToEmail
          ? "OTP expired. SMS unavailable in trial mode. A new OTP was sent to your email."
          : "OTP expired. A new OTP has been sent."
      });
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
      const result = await deliverOtp(user, newCode, authMethod);
      return res.status(400).json({
        message: result.fellBackToEmail
          ? "Invalid OTP. SMS unavailable in trial mode. A new OTP was sent to your email."
          : "Invalid OTP. A new OTP has been sent."
      });
    }

    user.otpVerifiedAt = new Date();
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
