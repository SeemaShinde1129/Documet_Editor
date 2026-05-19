"use client";

import { useEffect, useState } from "react";

import { socket } from "@/lib/socket";
import { useDocumentStore } from "@/stores/document.store";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

type ConnectionStatusProps = {
  className?: string;
  showLabel?: boolean;
};

const getInitialConnectionState = (): ConnectionState => {
  return socket.connected ? "connected" : "disconnected";
};

const statusConfig: Record<
  ConnectionState,
  {
    label: string;
    dotClassName: string;
    className: string;
  }
> = {
  connected: {
    label: "Connected",
    dotClassName: "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  reconnecting: {
    label: "Reconnecting",
    dotClassName:
      "animate-pulse bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.14)]",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  disconnected: {
    label: "Offline",
    dotClassName: "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)]",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function ConnectionStatus({
  className = "",
  showLabel = true,
}: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    getInitialConnectionState,
  );
  const setConnectionStatus = useDocumentStore(
    (state) => state.setConnectionStatus,
  );

  useEffect(() => {
    const handleConnect = () => {
      setConnectionState("connected");
      setConnectionStatus(true);
    };

    const handleDisconnect = () => {
      setConnectionState(socket.active ? "reconnecting" : "disconnected");
      setConnectionStatus(false);
    };

    const handleReconnectAttempt = () => {
      setConnectionState("reconnecting");
      setConnectionStatus(false);
    };

    const handleReconnect = () => {
      setConnectionState("connected");
      setConnectionStatus(true);
    };

    const handleReconnectFailed = () => {
      setConnectionState("disconnected");
      setConnectionStatus(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.io.on("reconnect", handleReconnect);
    socket.io.on("reconnect_failed", handleReconnectFailed);

    setConnectionStatus(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.io.off("reconnect", handleReconnect);
      socket.io.off("reconnect_failed", handleReconnectFailed);
    };
  }, [setConnectionStatus]);

  const config = statusConfig[connectionState];

  return (
    <span
      className={`inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${config.className} ${className}`}
      aria-live="polite"
      title={config.label}
    >
      <span
        className={`size-2 rounded-full transition-colors ${config.dotClassName}`}
        aria-hidden="true"
      />
      {showLabel ? <span>{config.label}</span> : null}
    </span>
  );
}

export default ConnectionStatus;
