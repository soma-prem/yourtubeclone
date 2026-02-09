"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Play, FileVideo } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    }
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/user/downloads/${user._id}`);
      setDownloads(res.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Track your downloads</h2>
        <p className="text-muted-foreground">Sign in to view your download history.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">Loading downloads...</div>;
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-muted-foreground">Videos you download will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{downloads.length} videos</p>
      </div>

      <div className="space-y-4">
        {downloads.map((item) => {
          
          const videoTitle = item.videoId?.videotitle || item.title || "Unknown Video";
          const videoChannel = item.videoId?.videochanel || "Unknown Channel";
          const downloadDate = item.downloadedAt ? formatDistanceToNow(new Date(item.downloadedAt)) : "Recently";

          return (
            <div key={item._id} className="flex gap-4 group">
              {}
              <div className="flex-shrink-0">
                <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden flex items-center justify-center">
                  {item.videoId ? (
                    <Link href={`/watches/${item.videoId._id}`}>
                        <video
                        src={`${process.env.BACKEND_URL}/${item.videoId.filepath}`}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        />
                    </Link>
                  ) : (
                    <FileVideo className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              </div>

              {}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoId ? (
                        <Link href={`/watches/${item.videoId._id}`}>{videoTitle}</Link>
                    ) : (
                        <span>{videoTitle} (Video Deleted)</span>
                    )}
                </h3>
                
                <p className="text-sm text-muted-foreground">{videoChannel}</p>
                
                <div className="flex items-center gap-2 mt-1 text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded">
                   <Download className="w-3 h-3" />
                   Downloaded {downloadDate} ago
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
