import mongoose from "mongoose";

const userschema = new mongoose.Schema({
  email: { type: String, require: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  phone: { type: String },

  
  otpCode: { type: String },
  otpExpiresAt: { type: Date },
  otpMethod: { type: String },
  otpLastSentAt: { type: Date },
  otpVerifiedAt: { type: Date },

  
  plan: { 
    type: String, 
    
    enum: ['FREE', 'BRONZE', 'SILVER', 'GOLD'], 
    default: 'FREE' 
  },
  downloadsToday: { 
    type: Number, 
    default: 0 
  },
  lastDownloadDate: { 
    type: Date, 
    default: Date.now 
  },
  downloadHistory: [{
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'videofiles' },
    title: String,
    downloadedAt: { type: Date, default: Date.now }
  }]
});



userschema.methods.checkResetDailyDownloads = function() {
  const today = new Date();
  const lastDate = new Date(this.lastDownloadDate);

  
  if (today.toDateString() !== lastDate.toDateString()) {
    this.downloadsToday = 0;
    this.lastDownloadDate = today;
    return true; 
  }
  return false; 
};


export default mongoose.model("user", userschema);
