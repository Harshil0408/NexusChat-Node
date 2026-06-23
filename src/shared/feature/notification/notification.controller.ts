import { Request, Response } from "express";
import { asyncHandler } from "@shared/asyncHandler";
import { notificationService } from "./notification.service";
import { sendSuccess } from "@shared/response";

export class NotificationController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const notifications = await notificationService.getUserNotifications(
      req.user!.userId,
      limit,
      offset,
    );
    sendSuccess(
      res,
      notifications,
      200,
      undefined,
      "Notifications fetched successfully!",
    );
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    sendSuccess(
      res,
      { count },
      200,
      undefined,
      "Unread count fetched successfully!",
    );
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAsRead(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, null, 200, undefined, "Marked as read");
  });

  markAllRead = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    sendSuccess(res, null, 200, undefined, "All marked as read");
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.deleteNotification(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, null, 200, undefined, "Notification deleted");
  });
}
