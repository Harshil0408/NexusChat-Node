import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authenticate } from "@middlewares/authenticate";

const router = Router();
const ctrl = new NotificationController();

router.use(authenticate);

router.get("/", ctrl.getAll);
router.get("/unread-count", ctrl.getUnreadCount);
router.patch("/:id/read", ctrl.markRead);
router.patch("/read-all", ctrl.markAllRead);
router.delete("/:id", ctrl.delete);

export default router;
