"use client";

import type {
  DocumentJoinPayload,
  DocumentLoadPayload,
  DocumentSavedPayload,
  DocumentUpdatePayload,
  RoomUsersPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from "@repo/types/document";
import type { Socket } from "socket.io-client";
import { socket } from "@/lib/socket";

type DocumentServerToClientEvents = {
  "document:load": (payload: DocumentLoadPayload) => void;
  "document:updated": (
    payload: Omit<DocumentUpdatePayload, "username"> & {
      updatedBy: string;
    },
  ) => void;
  "document:saved": (payload: DocumentSavedPayload) => void;
  "document:error": (payload: { documentId: string; message: string }) => void;
  "room:users": (payload: RoomUsersPayload) => void;
  "user:joined": (payload: UserJoinedPayload) => void;
  "user:left": (payload: UserLeftPayload) => void;
};

type DocumentClientToServerEvents = {
  "document:join": (payload: DocumentJoinPayload) => void;
  "document:leave": (payload: DocumentJoinPayload) => void;
  "document:update": (payload: DocumentUpdatePayload) => void;
};

export type DocumentSocket = Socket<
  DocumentServerToClientEvents,
  DocumentClientToServerEvents
>;

export const documentSocket = socket as DocumentSocket;
