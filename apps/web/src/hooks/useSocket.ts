"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);

      console.info("Socket hook connected", {
        socketId: socket.id,
      });
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);

      console.info("Socket hook disconnected", {
        reason,
      });
    };

    const handleReconnect = (attempt: number) => {
      setIsConnected(socket.connected);

      console.info("Socket hook reconnected", {
        attempt,
        socketId: socket.id,
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect", handleReconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect", handleReconnect);
    };
  }, []);

  return {
    socket,
    isConnected,
  };
};
