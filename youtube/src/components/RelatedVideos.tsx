import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import React from "react";
import { getMediaUrl } from "@/lib/mediaUrl";

const RelatedVideos = ({ videos }: { videos: any[] }) => {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-2">
      {videos.map((vid: any) => (
        <Link key={vid._id} href={`/watches/${vid._id}`} className="flex gap-2 group">
          <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden flex-shrink-0">
            <video 
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200" 
                src={getMediaUrl(vid.filepath)}
                muted
                preload="metadata"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                {vid.videotitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{vid.videochanel}</p>
            <p className="text-xs text-muted-foreground">
                {vid.views?.toLocaleString() || 0} views • 
                {vid.createdAt ? formatDistanceToNow(new Date(vid.createdAt)) : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default RelatedVideos;
