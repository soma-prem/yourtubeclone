import comment from "../Modals/comment.js";
import mongoose from "mongoose";

const isValidComment = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const allowed = /^[\p{L}\p{N}\s.,!?'"()_-]+$/u;
  return allowed.test(trimmed);
};

export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, city, language } = req.body;

  if (!isValidComment(commentbody)) {
     return res.status(400).json({ message: "Comment contains invalid characters." });
  }

  const newComment = new comment({
    videoid,
    userid,
    commentbody: commentbody.trim(), 
    usercommented,
    city: city || "Unknown",
    language: language || "en", 
    likes: 0,
    dislikes: 0
  });

  try {
    const savedComment = await newComment.save();
    return res.status(200).json({ comment: true, data: savedComment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!isValidComment(commentbody)) {
     return res.status(400).json({ message: "Comment contains invalid characters." });
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id, 
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { action } = req.body; 

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }

  try {
    const commentData = await comment.findById(_id);
    if (!commentData) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (action === 'like') {
      commentData.likes += 1;
    } else if (action === 'dislike') {
      commentData.dislikes += 1;
    }

    if (commentData.dislikes >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ 
        deleted: true, 
        message: "Comment removed due to high dislikes." 
      });
    }

    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { 
        likes: commentData.likes,
        dislikes: commentData.dislikes 
      },
      { new: true }
    );

    return res.status(200).json({ 
      updated: true, 
      data: updatedComment 
    });

  } catch (error) {
    console.error("Like/Dislike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
