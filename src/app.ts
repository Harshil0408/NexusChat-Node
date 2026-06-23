import { errorHandler } from "@middlewares/errorHandler";
import { notFound } from "@middlewares/notFound";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./features/auth/auth.routes";
import userRoutes from "./features/users/user.routes";
import contactRoutes from "@features/contacts/contact.routes";
import notificationRoutes from "@shared/feature/notification/notification.routes";
import searchRoutes from "@features/users/user-search/user-search.routes";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
