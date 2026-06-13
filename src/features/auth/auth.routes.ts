import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "@middlewares/authenticate";
import { authorize } from "@middlewares/authorize";

const router = Router();
const ctrl = new AuthController();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/refresh", ctrl.refreshToken);
router.post("/logout", ctrl.logout);

router.post("/logout-all", authenticate, ctrl.logoutAll);
router.post("/2fa/setup", authenticate, ctrl.setup2FA);
router.post("/2fa/verify", authenticate, ctrl.verify2FA);
router.post("/2fa/disable", authenticate, ctrl.disable2FA);

router.get("/admin/sessions", authenticate, authorize("admin"), (_req, res) =>
  res.json({ message: "Admin only route" }),
);

export default router;
