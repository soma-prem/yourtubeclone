import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import path from "path";
import fs from "fs";
import { uploadBufferToGcs } from "../lib/gcs.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res.status(404).json({ message: "Upload a MP4 video file only" });
  } else {
    try{
        const ext = path.extname(req.file.originalname) || ".mp4";
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const destination = `videos/${req.file.fieldname}-${uniqueSuffix}${ext}`;
        const publicUrl = await uploadBufferToGcs({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          destination
        });
        const file=new video({
            videotitle:req.body.videotitle,
            filename:req.file.originalname,
            filepath:publicUrl,
            filetype:req.file.mimetype,
            filesize:req.file.size,
            videochanel:req.body.videochanel,
            uploader:req.body.uploader
        })
        await file.save()
        res.status(201).json(file);
    }catch(error){
        console.error("Login error:",error)
        res.status(500).json({ message: error.message });
    }
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


export const downloadVideo = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: "Login required to download" });
  }

  try {
    const user = await users.findById(userId);
    const videoData = await video.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!videoData) return res.status(404).json({ message: "Video not found" });

    
    user.checkResetDailyDownloads();

    
    if (user.plan === 'Free' && user.downloadsToday >= 1) {
      return res.status(403).json({
        message: "Daily download limit reached. Upgrade to Premium."
      });
    }

    
    user.downloadsToday += 1;
    user.lastDownloadDate = new Date();
    user.downloadHistory.push({
      videoId: videoData._id,
      title: videoData.videotitle,
      downloadedAt: new Date()
    });
    await user.save();

    
    if (videoData.filepath?.startsWith("http")) {
      return res.redirect(videoData.filepath);
    }

    const filePath = path.join(process.cwd(), videoData.filepath);
    if (fs.existsSync(filePath)) {
      res.download(filePath, videoData.filename, (err) => {
        if (err) {
          console.error("File download error:", err);
          if (!res.headersSent) {
             res.status(500).json({ message: "Error downloading file" });
          }
        }
      });
    } else {
      res.status(404).json({ message: "File not found on server" });
    }

  } catch (error) {
    console.error("Download controller error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
