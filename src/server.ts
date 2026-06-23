import "dotenv/config";
import http from "http";
import app from "./app";
import { env } from "@config/env";
import { connectDB } from "@db/pool";
import { logger } from "@shared/logger";
import { initSocket } from "./socket/socket";

async function bootstrap() {
  await connectDB();

  // Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // Attach Socket.io to HTTP server
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Socket.io ready`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
