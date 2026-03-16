"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface SignalMessage {
  type: "offer" | "answer" | "ice-candidate";
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export function useVoiceChat(roomId: string, playerId: string | null, enabled: boolean) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const makingOfferRef = useRef<Set<string>>(new Set());

  // Clean up a single peer
  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      audioElementsRef.current.delete(peerId);
    }
    setConnectedPeers((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Create peer connection to a remote player
  const createPeerConnection = useCallback(
    (remotePeerId: string): RTCPeerConnection => {
      // Clean existing connection if any
      if (peersRef.current.has(remotePeerId)) {
        cleanupPeer(remotePeerId);
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(remotePeerId, pc);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        let audio = audioElementsRef.current.get(remotePeerId);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audio.playsInline = true;
          document.body.appendChild(audio);
          audioElementsRef.current.set(remotePeerId, audio);
        }
        audio.srcObject = event.streams[0];
      };

      // Send ICE candidates via Supabase
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "ice-candidate",
              from: playerId,
              to: remotePeerId,
              payload: event.candidate.toJSON(),
            } as SignalMessage,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectedPeers((prev) => new Set(prev).add(remotePeerId));
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanupPeer(remotePeerId);
        }
      };

      return pc;
    },
    [playerId, cleanupPeer]
  );

  // Handle incoming signal
  const handleSignal = useCallback(
    async (signal: SignalMessage) => {
      if (!playerId || signal.to !== playerId) return;

      const remotePeerId = signal.from;

      if (signal.type === "offer") {
        const pc = createPeerConnection(remotePeerId);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "answer",
            from: playerId,
            to: remotePeerId,
            payload: answer,
          } as SignalMessage,
        });
      } else if (signal.type === "answer") {
        const pc = peersRef.current.get(remotePeerId);
        if (pc && !makingOfferRef.current.has(remotePeerId)) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        }
      } else if (signal.type === "ice-candidate") {
        const pc = peersRef.current.get(remotePeerId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload as RTCIceCandidateInit));
          } catch {
            // Ignore ICE candidate errors for candidates arriving before remote description
          }
        }
      }
    },
    [playerId, createPeerConnection]
  );

  // Start mic and connect to peers
  const startMic = useCallback(async () => {
    if (!playerId || !enabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setIsMicOn(true);
      setError(null);

      // Announce presence — other players will send offers
      channelRef.current?.send({
        type: "broadcast",
        event: "voice-join",
        payload: { playerId },
      });
    } catch (err) {
      setError("مش قادر يفتح المايك — اسمح للمتصفح");
      console.error("Mic error:", err);
    }
  }, [playerId, enabled]);

  // Stop mic
  const stopMic = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setIsMicOn(false);

    // Clean all peers
    peersRef.current.forEach((_, peerId) => cleanupPeer(peerId));

    channelRef.current?.send({
      type: "broadcast",
      event: "voice-leave",
      payload: { playerId },
    });
  }, [playerId, cleanupPeer]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
  }, [isMicOn, startMic, stopMic]);

  // Set up Supabase signaling channel
  useEffect(() => {
    if (!roomId || !playerId || !enabled) return;

    const channel = supabase.channel(`voice-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        handleSignal(payload as SignalMessage);
      })
      .on("broadcast", { event: "voice-join" }, ({ payload }) => {
        // When a new player joins voice, send them an offer
        const remotePeerId = (payload as { playerId: string }).playerId;
        if (remotePeerId === playerId || !localStreamRef.current) return;

        const pc = createPeerConnection(remotePeerId);
        makingOfferRef.current.add(remotePeerId);

        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            channel.send({
              type: "broadcast",
              event: "signal",
              payload: {
                type: "offer",
                from: playerId,
                to: remotePeerId,
                payload: pc.localDescription!,
              } as SignalMessage,
            });
            makingOfferRef.current.delete(remotePeerId);
          })
          .catch(() => {
            makingOfferRef.current.delete(remotePeerId);
          });
      })
      .on("broadcast", { event: "voice-leave" }, ({ payload }) => {
        const remotePeerId = (payload as { playerId: string }).playerId;
        cleanupPeer(remotePeerId);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      stopMic();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, playerId, enabled, supabase, handleSignal, createPeerConnection, cleanupPeer, stopMic]);

  return {
    isMicOn,
    toggleMic,
    connectedPeers: connectedPeers.size,
    error,
  };
}
