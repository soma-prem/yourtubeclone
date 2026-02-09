"use client"; 
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useState } from "react";


const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  
  if (hh) {
    
    return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
  }
  
  return `${mm}:${ss}`;
};

export default function VideoCard({ video }: any) {
  const [duration, setDuration] = useState("00:00");

  const handleMetadataLoaded = (e: any) => {
    const videoDuration = e.currentTarget.duration;
    setDuration(formatDuration(videoDuration));
  };

  return (
    <Link href={`/watches/${video?._id}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <video
            src={`${process.env.BACKEND_URL}/${video?.filepath}`}
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            
            onLoadedMetadata={handleMetadataLoaded}
            preload="metadata" 
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            {duration}
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{video?.videochanel?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video?.videotitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{video?.videochanel}</p>
            <p className="text-sm text-muted-foreground">
              {video?.views.toLocaleString()} views •{" "}
              {video?.createdAt && formatDistanceToNow(new Date(video?.createdAt))} ago
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
