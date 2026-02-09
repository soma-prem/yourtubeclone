import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String, required: true },
    usercommented: { type: String },
    
    city: { type: String, default: "Unknown" },
    language: { type: String, default: "en" },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    
  },
  {
    timestamps: true, 
    
  }
);

export default mongoose.model("comment", commentschema);