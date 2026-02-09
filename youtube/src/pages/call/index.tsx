"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type SignalPayload =
  | { type: "offer"; sdp: any }
  | { type: "answer"; sdp: any }
  | { type: "ice"; candidate: any };

const getWsUrl = () => {
  if (typeof window === "undefined") return "";
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return envUrl;
  const host = window.location.hostname;
  return `ws://${host}:5000`;
};

const CallPage = () => {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenAudioSenderRef = useRef<RTCRtpSender | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const hasOfferedRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const rtcConfig = useMemo(
    () => ({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }),
    []
  );

  const cleanup = () => {
    mediaRecorderRef.current?.stop();
    pcRef.current?.close();
    wsRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current = null;
    wsRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    screenStreamRef.current = null;
    screenAudioSenderRef.current = null;
    hasOfferedRef.current = false;
    setJoined(false);
    setStatus("Idle");
    setIsScreenSharing(false);
    setShareError(null);
  };

  const sendSignal = (payload: SignalPayload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ type: "signal", roomId, payload })
    );
  };

  const setupPeer = async () => {
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    const local = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localStreamRef.current = local;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = local;
    }
    local.getTracks().forEach((track) => pc.addTrack(track, local));

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remote;
    }

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((t) => remote.addTrack(t));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: "ice", candidate: event.candidate });
      }
    };
  };

  const joinRoom = async () => {
    if (!roomId.trim()) return;
    setStatus("Joining...");
    await setupPeer();
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
      setJoined(true);
      setStatus("Waiting for peer...");
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "room-full") {
        setStatus("Room is full");
        ws.close();
        return;
      }
      if (msg.type === "room-info") {
        const count = msg.payload?.count || 1;
        const shouldInitiate = !!msg.payload?.isInitiator;
        if (count >= 2 && shouldInitiate && !hasOfferedRef.current) {
          const pc = pcRef.current;
          if (!pc) return;
          hasOfferedRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", sdp: offer });
          setStatus("Calling...");
        }
      }

      if (msg.type === "signal") {
        const pc = pcRef.current;
        if (!pc) return;
        const payload: SignalPayload = msg.payload;
        if (payload.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", sdp: answer });
          setStatus("Connected");
        }
        if (payload.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          setStatus("Connected");
        }
        if (payload.type === "ice") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {}
        }
      }
    };

    ws.onclose = () => {
      setStatus("Disconnected");
    };
  };

  const startScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    setShareError(null);
    const display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    screenStreamRef.current = display;
    const screenTrack = display.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      sender.replaceTrack(screenTrack);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = display;
    }
    const screenAudioTrack = display.getAudioTracks()[0];
    if (screenAudioTrack) {
      screenAudioSenderRef.current = pc.addTrack(screenAudioTrack, display);
    }
    screenTrack.onended = () => {
      stopScreenShare();
    };
    setIsScreenSharing(true);
  };

  const stopScreenShare = () => {
    const pc = pcRef.current;
    const local = localStreamRef.current;
    const screen = screenStreamRef.current;
    if (!pc || !local) return;
    const localTrack = local.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender && localTrack) sender.replaceTrack(localTrack);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = local;
    }
    if (screenAudioSenderRef.current) {
      pc.removeTrack(screenAudioSenderRef.current);
      screenAudioSenderRef.current = null;
    }
    screen?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  };

  const startRecording = () => {
    if (isRecording) return;
    const tracks: MediaStreamTrack[] = [];
    pcRef.current?.getSenders().forEach((s) => {
      if (s.track) tracks.push(s.track);
    });
    remoteStreamRef.current?.getTracks().forEach((t) => tracks.push(t));
    const stream = new MediaStream(tracks);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;
    recordChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Video Call</h1>
          <span className="text-sm text-muted-foreground">{status}</span>
        </div>

        {!joined && (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Room ID (share with friend)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm"
              onClick={joinRoom}
            >
              Join
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg overflow-hidden border">
            <div className="px-3 py-2 text-xs text-muted-foreground">You</div>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-64 bg-black" />
          </div>
          <div className="bg-card rounded-lg overflow-hidden border">
            <div className="px-3 py-2 text-xs text-muted-foreground">Friend</div>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-64 bg-black" />
          </div>
        </div>

        {joined && (
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-secondary px-4 py-2 text-sm"
              onClick={async () => {
                try {
                  await startScreenShare();
                } catch (err: any) {
                  setShareError("Screen share was blocked or canceled.");
                  setIsScreenSharing(false);
                }
              }}
              disabled={isScreenSharing}
            >
              Share Screen (select YouTube tab)
            </button>
            <button
              className="rounded-md bg-secondary px-4 py-2 text-sm"
              onClick={stopScreenShare}
              disabled={!isScreenSharing}
            >
              Stop Share
            </button>
            {!isRecording ? (
              <button
                className="rounded-md bg-secondary px-4 py-2 text-sm"
                onClick={startRecording}
              >
                Start Recording
              </button>
            ) : (
              <button
                className="rounded-md bg-secondary px-4 py-2 text-sm"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            )}
            <button
              className="rounded-md bg-destructive/20 text-destructive px-4 py-2 text-sm"
              onClick={cleanup}
            >
              Leave Call
            </button>
          </div>
        )}

        {joined && (
          <div className="text-xs text-muted-foreground">
            To share YouTube: choose the Chrome/Edge tab with YouTube and enable
            "Share audio" in the picker.
          </div>
        )}
        {shareError && (
          <div className="text-xs text-destructive">{shareError}</div>
        )}

        {recordedUrl && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Recording ready:</p>
            <a
              className="text-sm underline"
              href={recordedUrl}
              download={`call-${roomId || "session"}.webm`}
            >
              Download recording
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallPage;
