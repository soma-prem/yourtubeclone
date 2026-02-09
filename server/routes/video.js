import express from "express";
import { uploadvideo, getallvideo, downloadVideo } from "../controllers/video.js"; 

const routes = express.Router();

routes.post("/upload", uploadvideo);
routes.get("/getall", getallvideo);



routes.get("/download/:id", downloadVideo);

export default routes;