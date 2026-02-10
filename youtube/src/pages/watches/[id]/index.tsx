import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import VideoPlayer from "@/components/Videoplayer"; 
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext"; 
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useRef, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser(); 
  
  const [currentVideo, setCurrentVideo] = useState<any>(null); 
  const [allVideos, setAllVideos] = useState<any[]>([]);       
  const [loading, setLoading] = useState(true);
  const [watchTimeLimit, setWatchTimeLimit] = useState<number>(5);
  const commentsRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!id || typeof id !== "string") return;
      
      try {
        const res = await axiosInstance.get("/video/getall");
        const videosList = res.data;

        const foundVideo = videosList.find((vid: any) => vid._id === id);

        setCurrentVideo(foundVideo);
        setAllVideos(videosList);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) {
        setWatchTimeLimit(5);
        return;
      }
      try {
        const res = await axiosInstance.get(`/user/status/${user._id}`);
        const limit = Number(res.data.watchTimeLimit);
        setWatchTimeLimit(Number.isFinite(limit) ? limit : 5);
      } catch (error) {
        console.error("Error fetching status:", error);
        setWatchTimeLimit(5);
      }
    };
    fetchStatus();
  }, [user]);

  
  useEffect(() => {
    const addToHistory = async () => {
      
      if (!id || typeof id !== "string" || !user) return;

      try {
        
        
        await axiosInstance.post(`/history/${id}`, { 
            userId: user._id 
        });
      } catch (error) {
        console.error("Failed to save history:", error);
      }
    };

    addToHistory();
  }, [id, user]); 

  const currentIndex = useMemo(() => {
    return allVideos.findIndex((vid: any) => vid._id === currentVideo?._id);
  }, [allVideos, currentVideo]);

  const handleNextVideo = () => {
    if (!allVideos.length || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % allVideos.length;
    const nextVideo = allVideos[nextIndex];
    if (nextVideo?._id) {
      router.push(`/watches/${nextVideo._id}`);
    }
  };

  const handleOpenComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCloseSite = () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) {
        router.push("/");
      }
    }, 200);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  
  if (!currentVideo) {
    return <div className="p-8 text-center">Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <VideoPlayer
              video={currentVideo}
              watchTimeLimit={watchTimeLimit}
              onNextVideo={handleNextVideo}
              onOpenComments={handleOpenComments}
              onCloseSite={handleCloseSite}
            />
            <VideoInfo video={currentVideo} />
            
            <div className="mt-6" ref={commentsRef}>
              <Comments videoId={currentVideo._id} />
            </div>
          </div>

          <div className="space-y-4">
            <RelatedVideos videos={allVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
