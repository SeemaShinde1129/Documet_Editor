"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export const setSocketAuthToken = (token: string | null): void => {
  socket.auth = token ? { token } : {};
};

socket.on("connect", () => {
  console.info("Socket connected", {
    socketId: socket.id,
  });
});

socket.on("disconnect", (reason) => {
  console.info("Socket disconnected", {
    reason,
  });
});

socket.on("connect_error", (error) => {
  console.warn("Socket connection failed", {
    message: error.message,
  });
});

socket.io.on("reconnect", (attempt) => {
  console.info("Socket reconnected", {
    attempt,
    socketId: socket.id,
  });
});

export default socket;
