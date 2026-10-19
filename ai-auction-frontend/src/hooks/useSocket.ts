import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const useSocket = (auctionId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(1);
  const [latestBid, setLatestBid] = useState<{ amount: number; userName: string; time: string } | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    s.on("connect", () => {
      console.log("⚡ [Socket.IO] Connected to server");
      if (auctionId) {
        s.emit("join:auction", auctionId);
      }
    });

    s.on("viewer:count", (data: { auctionId: string; count: number }) => {
      if (data.auctionId === auctionId) {
        setViewerCount(data.count);
      }
    });

    s.on("bid:placed", (data: { vehicleId: string; amount: number; userName: string; time: string }) => {
      if (data.vehicleId === auctionId) {
        setLatestBid(data);
      }
    });

    setSocket(s);

    return () => {
      if (auctionId) {
        s.emit("leave:auction", auctionId);
      }
      s.disconnect();
    };
  }, [auctionId]);

  return { socket, viewerCount, latestBid };
};
