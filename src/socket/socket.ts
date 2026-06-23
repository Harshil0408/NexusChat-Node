import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "@shared/logger";
import { env } from "@config/env";
import { JwtPayload } from "@features/auth/auth.types";

const log = logger.child({
  module: "Socket",
});

export let io: SocketServer;

const onlineUsers = new Map<string, Set<string>>();

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? "http://localhost:3000",
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No Token Provided"));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      if (payload.type !== "access")
        return next(new Error("Invalid token type"));
      (socket as any).user = payload;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    log.info({ userId: user.userId, socketId: socket.id }, "Connected");

    if (!onlineUsers.has(user.userId)) {
      onlineUsers.set(user.userId, new Set());
    }

    onlineUsers.get(user.userId)!.add(socket.id);

    socket.join(`user:${user.userId}`);

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(user.userId);
      }
      log.info({ userId: user.userId }, "Disconnected");
    });
  });

  return io;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

// emit user
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToUsers(
  userIds: string[],
  event: string,
  data: unknown,
): void {
  userIds.forEach((id) => emitToUser(id, event, data));
}
