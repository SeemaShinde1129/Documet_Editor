import type {
  DocumentJoinPayload,
  DocumentLoadPayload,
  DocumentUpdatePayload,
  RoomUsersPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from "@repo/types/document";
import type { Server as SocketServer } from "socket.io";
import type { AuthenticatedUser } from "../auth/supabase-auth";
import {
  canAccessDocument,
  ensureUserRecord,
  getAccessibleDocumentById,
  getDocumentOwnerId,
  updateDocumentContent,
} from "../services/document.service";

const AUTOSAVE_DELAY_MS = 2_000;
const documentSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const activeSocketsByDocument = new Map<string, Map<string, Set<string>>>();
const socketPresenceBySocketId = new Map<string, Map<string, string>>();

const getDocumentRoomName = (documentId: string): string =>
  `document:${documentId}`;

const getAuthenticatedSocketUser = (socketData: {
  authenticatedUser?: AuthenticatedUser;
}): AuthenticatedUser | null => {
  return socketData.authenticatedUser ?? null;
};

const getActiveUsers = (documentId: string): string[] => {
  return Array.from(activeSocketsByDocument.get(documentId)?.keys() ?? []);
};

const broadcastActiveUsers = (io: SocketServer, documentId: string): void => {
  const payload: RoomUsersPayload = {
    documentId,
    users: getActiveUsers(documentId),
  };

  io.to(getDocumentRoomName(documentId)).emit("room:users", payload);
};

const addActiveUser = (
  documentId: string,
  username: string,
  socketId: string,
): void => {
  const socketPresence =
    socketPresenceBySocketId.get(socketId) ?? new Map<string, string>();
  const previousUsername = socketPresence.get(documentId);

  if (previousUsername && previousUsername !== username) {
    removeActiveUser(documentId, previousUsername, socketId);
  }

  const activeUsers =
    activeSocketsByDocument.get(documentId) ?? new Map<string, Set<string>>();
  const activeSocketIds = activeUsers.get(username) ?? new Set<string>();

  activeSocketIds.add(socketId);
  activeUsers.set(username, activeSocketIds);
  activeSocketsByDocument.set(documentId, activeUsers);

  socketPresence.set(documentId, username);
  socketPresenceBySocketId.set(socketId, socketPresence);
};

const removeActiveUser = (
  documentId: string,
  username: string,
  socketId: string,
): void => {
  const activeUsers = activeSocketsByDocument.get(documentId);

  if (activeUsers) {
    const activeSocketIds = activeUsers.get(username);

    if (activeSocketIds) {
      activeSocketIds.delete(socketId);

      if (activeSocketIds.size === 0) {
        activeUsers.delete(username);
      }
    }

    if (activeUsers.size === 0) {
      activeSocketsByDocument.delete(documentId);

      console.log("Document room presence cleaned up", {
        documentId,
        socketId,
      });
    }
  }

  const socketPresence = socketPresenceBySocketId.get(socketId);

  if (socketPresence) {
    socketPresence.delete(documentId);

    if (socketPresence.size === 0) {
      socketPresenceBySocketId.delete(socketId);
    }
  }
};

const scheduleDocumentAutosave = (
  io: SocketServer,
  payload: DocumentUpdatePayload,
  socketId: string,
): void => {
  const { documentId, content, username } = payload;
  const existingTimer = documentSaveTimers.get(documentId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  console.log("Document autosave scheduled", {
    username,
    documentId,
    socketId,
    delayMs: AUTOSAVE_DELAY_MS,
  });

  const saveTimer = setTimeout(() => {
    void (async () => {
      try {
        console.log("Document autosave started", {
          username,
          documentId,
          socketId,
        });

        await updateDocumentContent(documentId, content);

        const savedAt = new Date().toISOString();
        const roomName = getDocumentRoomName(documentId);

        console.log("Document autosave completed", {
          username,
          documentId,
          socketId,
          savedAt,
        });

        io.to(roomName).emit("document:saved", {
          documentId,
          savedAt,
        });

        console.log("Document save emit triggered", {
          documentId,
          roomName,
          savedAt,
        });
      } catch (error) {
        console.error("Document autosave failed", {
          username,
          documentId,
          socketId,
          error,
        });
      } finally {
        const activeTimer = documentSaveTimers.get(documentId);

        if (activeTimer === saveTimer) {
          documentSaveTimers.delete(documentId);
        }
      }
    })();
  }, AUTOSAVE_DELAY_MS);

  documentSaveTimers.set(documentId, saveTimer);
};

export const registerDocumentSocketHandlers = (io: SocketServer): void => {
  io.on("connection", (socket) => {
    socket.on("document:join", async (payload: DocumentJoinPayload) => {
      const { documentId, username } = payload;
      const roomName = getDocumentRoomName(documentId);

      try {
        const authenticatedUser = getAuthenticatedSocketUser(socket.data);

        if (!authenticatedUser) {
          socket.emit("document:error", {
            message: "Authentication is required",
            documentId,
          });

          return;
        }

        await ensureUserRecord(authenticatedUser);

        const document = await getAccessibleDocumentById(
          documentId,
          authenticatedUser.id,
        );

        if (!document) {
          const ownerId = await getDocumentOwnerId(documentId);

          console.warn("Document load failed: access denied", {
            username,
            documentId,
            userId: authenticatedUser.id,
            socketId: socket.id,
          });

          socket.emit("document:error", {
            message: ownerId
              ? "You do not have access to this document"
              : "Document not found",
            documentId,
          });

          return;
        }

        const loadPayload: DocumentLoadPayload = {
          documentId: document.id,
          title: document.title,
          content: document.content,
        };

        socket.emit("document:load", loadPayload);

        console.log("Document loaded for socket", {
          username,
          documentId,
          userId: authenticatedUser.id,
          socketId: socket.id,
        });

        await socket.join(roomName);
        addActiveUser(documentId, username, socket.id);

        console.log("Document room joined", {
          username,
          documentId,
          socketId: socket.id,
          activeUserCount: getActiveUsers(documentId).length,
        });

        const userJoinedPayload: UserJoinedPayload = {
          documentId,
          username,
        };

        socket.to(roomName).emit("user:joined", userJoinedPayload);

        broadcastActiveUsers(io, documentId);
      } catch (error) {
        console.error("Document load failed", {
          username,
          documentId,
          socketId: socket.id,
          error,
        });

        socket.emit("document:error", {
          message: "Failed to load document",
          documentId,
        });
      }
    });

    socket.on("document:leave", async (payload: DocumentJoinPayload) => {
      const { documentId, username } = payload;
      const roomName = getDocumentRoomName(documentId);

      await socket.leave(roomName);
      removeActiveUser(documentId, username, socket.id);

      console.log("Document room left", {
        username,
        documentId,
        socketId: socket.id,
        activeUserCount: getActiveUsers(documentId).length,
      });

      const userLeftPayload: UserLeftPayload = {
        documentId,
        username,
      };

      io.to(roomName).emit("user:left", userLeftPayload);

      broadcastActiveUsers(io, documentId);
    });

    socket.on("document:update", (payload: DocumentUpdatePayload) => {
      void (async () => {
        const { documentId, content, username } = payload;
        const roomName = getDocumentRoomName(documentId);

        try {
          const authenticatedUser = getAuthenticatedSocketUser(socket.data);

          if (!authenticatedUser) {
            socket.emit("document:error", {
              message: "Authentication is required",
              documentId,
            });

            return;
          }

          const hasAccess = await canAccessDocument(
            documentId,
            authenticatedUser.id,
          );

          if (!hasAccess) {
            console.warn("Realtime document update rejected: access denied", {
              username,
              documentId,
              userId: authenticatedUser.id,
              socketId: socket.id,
            });

            socket.emit("document:error", {
              message: "You do not have access to edit this document",
              documentId,
            });

            return;
          }

          console.log("Realtime document update received", {
            username,
            documentId,
            userId: authenticatedUser.id,
            socketId: socket.id,
          });

          socket.to(roomName).emit("document:updated", {
            documentId,
            content,
            updatedBy: username,
          });

          scheduleDocumentAutosave(io, payload, socket.id);
        } catch (error) {
          console.error("Realtime document update failed", {
            username,
            documentId,
            socketId: socket.id,
            error,
          });

          socket.emit("document:error", {
            message: "Failed to update document",
            documentId,
          });
        }
      })();
    });

    socket.on("disconnect", () => {
      const socketPresence = socketPresenceBySocketId.get(socket.id);

      if (!socketPresence) {
        return;
      }

      const documentsToCleanup = Array.from(socketPresence.entries());

      for (const [documentId, username] of documentsToCleanup) {
        removeActiveUser(documentId, username, socket.id);

        console.log("Document room left on disconnect", {
          username,
          documentId,
          socketId: socket.id,
          activeUserCount: getActiveUsers(documentId).length,
        });

        const userLeftPayload: UserLeftPayload = {
          documentId,
          username,
        };

        socket
          .to(getDocumentRoomName(documentId))
          .emit("user:left", userLeftPayload);

        broadcastActiveUsers(io, documentId);
      }
    });
  });
};
