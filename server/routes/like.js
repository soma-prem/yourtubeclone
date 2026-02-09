import express from "express";
import { handlelike, getallLikedVideo, getLikeStatus } from "../controllers/like.js"; 

const routes = express.Router();

routes.get("/:userId", getallLikedVideo);
routes.get("/status/:videoId/:userId", getLikeStatus); 
routes.post("/:videoId", handlelike);

export default routes;