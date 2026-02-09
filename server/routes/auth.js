import express from "express";
import { 
  login, 
  otpRoutingMiddleware,
  updatePhone,
  requestOtp,
  verifyOtp,
  updateprofile, 
  trackDownload, 
  getDownloadHistory, 
  getUserStatus,
  upgradeToPremium 
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/login", otpRoutingMiddleware, login);
routes.patch("/phone/:id", updatePhone);
routes.post("/request-otp", requestOtp);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
routes.post("/track-download", trackDownload);
routes.get("/downloads/:id", getDownloadHistory);
routes.get("/status/:id", getUserStatus);


routes.post("/upgrade", upgradeToPremium);

export default routes;
