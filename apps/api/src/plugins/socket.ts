import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { Server as SocketServer } from "socket.io";
import { getAuthenticatedUserFromToken } from "../auth/supabase-auth";
import { env } from "../config/env";
import { registerDocumentSocketHandlers } from "../sockets/document.socket";

const socketInstances = new WeakMap<HttpServer, SocketServer>();

export const registerSocket = async (
  app: FastifyInstance,
  httpServer: HttpServer = app.server,
): Promise<SocketServer> => {
  const existingSocketServer = socketInstances.get(httpServer);

  if (existingSocketServer) {
    return existingSocketServer;
  }

  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URLS,
      credentials: true,
    },
    transports: ["websocket"],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (typeof token !== "string" || token.trim().length === 0) {
        return next(new Error("Authentication is required"));
      }

      const authenticatedUser = await getAuthenticatedUserFromToken(token);

      socket.data.authenticatedUser = authenticatedUser;

      return next();
    } catch (error) {
      app.log.warn({ err: error }, "Socket authentication failed");

      return next(new Error("Invalid authentication session"));
    }
  });

  io.on("connection", (socket) => {
    app.log.info({ socketId: socket.id }, "Socket connected");

    socket.on("disconnect", () => {
      app.log.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  registerDocumentSocketHandlers(io);

  app.addHook("onClose", async () => {
    await io.close();
  });

  socketInstances.set(httpServer, io);

  return io;
};
