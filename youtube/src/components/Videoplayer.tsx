"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onOpenComments?: () => void;
  onCloseSite?: () => void;
}

export default function VideoPlayer({
  video,
  onNextVideo,
  onOpenComments,
  onCloseSite
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapRef = useRef<{
    lastTime: number;
    count: number;
    zone: "left" | "center" | "right" | null;
    timer: number | null;
  }>({ lastTime: 0, count: 0, zone: null, timer: null });

  const getZone = (clientX: number, rect: DOMRect) => {
    const third = rect.width / 3;
    if (clientX < rect.left + third) return "left";
    if (clientX > rect.left + 2 * third) return "right";
    return "center";
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const seek = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
    el.currentTime = next;
  };

  const handleTap = (e: PointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const zone = getZone(e.clientX, rect);
    const now = Date.now();
    const TAP_DELAY = 280;

    if (tapRef.current.timer) {
      window.clearTimeout(tapRef.current.timer);
      tapRef.current.timer = null;
    }

    if (tapRef.current.zone === zone && now - tapRef.current.lastTime < TAP_DELAY) {
      tapRef.current.count += 1;
    } else {
      tapRef.current.count = 1;
      tapRef.current.zone = zone;
    }
    tapRef.current.lastTime = now;

    tapRef.current.timer = window.setTimeout(() => {
      const count = tapRef.current.count;
      const finalZone = tapRef.current.zone;
      tapRef.current.count = 0;
      tapRef.current.zone = null;
      tapRef.current.timer = null;

      if (finalZone === "left") {
        if (count >= 3) {
          onOpenComments?.();
          return;
        }
        if (count === 2) {
          seek(-10);
        }
      } else if (finalZone === "right") {
        if (count >= 3) {
          onCloseSite?.();
          return;
        }
        if (count === 2) {
          seek(10);
        }
      } else if (finalZone === "center") {
        if (count >= 3) {
          onNextVideo?.();
          return;
        }
        if (count === 1) {
          togglePlay();
        }
      }
    }, TAP_DELAY);
  };

  return (
    <div
      className="aspect-video bg-black rounded-lg overflow-hidden"
      style={{ touchAction: "manipulation" }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") e.preventDefault();
      }}
      onDoubleClick={(e) => e.preventDefault()}
      onPointerUp={handleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        controls={false}
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noplaybackrate"
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.BACKEND_URL}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
