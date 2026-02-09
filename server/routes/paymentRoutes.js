import express from "express";
import { upgradeToPremium } from "../controllers/userController.js"; 

const router = express.Router();


router.post("/upgrade", upgradeToPremium);



export default router;