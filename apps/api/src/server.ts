import cors from "@fastify/cors";
import fastify, { type FastifyInstance } from "fastify";
import { env } from "./config/env";
import { registerErrorHandler } from "./plugins/error-handler";
import { registerSocket } from "./plugins/socket";
import { documentRoutes } from "./routes/document.routes";

const DEFAULT_HOST = "0.0.0.0";

const createFastifyServer = (): FastifyInstance => {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  app.register(cors, {
    origin: env.CLIENT_URLS,
    credentials: true,
  });

  void registerErrorHandler(app);

  app.get("/health", async () => {
    return {
      success: true,
      message: "Server is running",
    };
  });

  app.register(documentRoutes);

  return app;
};

export const server = createFastifyServer();

export const bootstrap = async (): Promise<void> => {
  try {
    const port = env.PORT;
    const host = process.env.HOST ?? DEFAULT_HOST;
    const httpServer = server.server;

    server.log.info("Initializing Socket.IO on Fastify HTTP server");
    await registerSocket(server, httpServer);

    await server.listen({ port, host });

    server.log.info(
      { host, port, socketServerAttached: Boolean(httpServer) },
      "API server started successfully",
    );
  } catch (error) {
    server.log.error({ err: error }, "Failed to start API server");
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  void bootstrap();
}

export default server;
