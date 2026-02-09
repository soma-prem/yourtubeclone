"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Loader2,
  Lock 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner"; 

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  
  const [downloadLimitReached, setDownloadLimitReached] = useState(false);
  

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  
  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/user/status/${user._id}`);
        const { plan, downloadsToday } = res.data;
        
        
        if (plan === "Free" && downloadsToday >= 1) {
          setDownloadLimitReached(true);
        } else {
          setDownloadLimitReached(false);
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };

    fetchUserStatus();
  }, [user, isDownloading]); 
  

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user && video) {
        try {
          const res = await axiosInstance.get(`/like/status/${video._id}/${user._id}`);
          setIsLiked(res.data.isLiked);
        } catch (error) {
          console.log(error);
        }
      }
    };
    checkLikeStatus();
  }, [video, user]);

  useEffect(() => {
      const checkWatchLaterStatus = async () => {
        if (user && video) {
          try {
            const res = await axiosInstance.get(`/watch/${user._id}`);
            const isSaved = res.data.some((item:any) => item.videoid._id === video._id);
            setIsWatchLater(isSaved);
          } catch (error) {
            console.log(error);
          }
        }
      };
      checkWatchLaterStatus();
    }, [video, user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, { userId: user?._id });
      if (res.data.liked) {
        setlikes((prev:any) => prev + 1); setIsLiked(true);
        if (isDisliked) { setDislikes((prev:any) => prev - 1); setIsDisliked(false); }
      } else {
        setlikes((prev:any) => prev - 1); setIsLiked(false);
      }
    } catch (error) { console.log(error); }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, { userId: user?._id });
      if (!res.data.liked) {
        if (isDisliked) { setDislikes((prev: any) => prev - 1); setIsDisliked(false); } 
        else {
          setDislikes((prev: any) => prev + 1); setIsDisliked(true);
          if (isLiked) { setlikes((prev: any) => prev - 1); setIsLiked(false); }
        }
      }
    } catch (error) { console.log(error); }
  };

  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, { userId: user?._id });
      if (res.data.watchlater) { setIsWatchLater(!isWatchLater); } 
      else { setIsWatchLater(false); }
    } catch (error) { console.log(error); }
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos.");
      return;
    }
    
    if (downloadLimitReached) {
        toast.error("Daily download limit reached. Upgrade to Premium.");
        return;
    }

    setIsDownloading(true);

    try {
      const response = await axiosInstance.get(`/video/download/${video._id}`, {
        params: { userId: user._id },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', video.filename || `${video.videotitle}.mp4`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started!");
      
      
      
      setDownloadLimitReached(true); 

    } catch (error: any) {
      console.error("Download error:", error);
      if (error.response && error.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
             try {
                 const errorData = JSON.parse(reader.result as string);
                 toast.error(errorData.message || "Download failed.");
             } catch (e) {
                 toast.error("An error occurred.");
             }
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error("Failed to download video.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-muted-foreground">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary rounded-full">
            <Button variant="ghost" size="sm" className="rounded-l-full" onClick={handleLike}>
              <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? "fill-foreground text-foreground" : ""}`} />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="ghost" size="sm" className="rounded-r-full" onClick={handleDislike}>
              <ThumbsDown className={`w-5 h-5 mr-2 ${isDisliked ? "fill-foreground text-foreground" : ""}`} />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" className={`bg-secondary rounded-full ${isWatchLater ? "text-primary" : ""}`} onClick={handleWatchLater}>
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          
          <Button variant="ghost" size="sm" className="bg-secondary rounded-full">
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>

          {}
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-full transition-colors ${
                downloadLimitReached 
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-not-allowed opacity-80" 
                : "bg-secondary hover:bg-secondary/80"
            }`}
            onClick={handleDownload}
            disabled={isDownloading || downloadLimitReached}
            title={downloadLimitReached ? "Daily download limit reached" : "Download Video"}
          >
            {isDownloading ? (
               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : downloadLimitReached ? (
               <Lock className="w-5 h-5 mr-2" />
            ) : (
               <Download className="w-5 h-5 mr-2" />
            )}
            {downloadLimitReached ? "Limit Reached" : "Download"}
          </Button>
          {}

          <Button variant="ghost" size="icon" className="bg-secondary rounded-full">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="bg-secondary rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>Sample video description...</p>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto font-medium" onClick={() => setShowFullDescription(!showFullDescription)}>
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
