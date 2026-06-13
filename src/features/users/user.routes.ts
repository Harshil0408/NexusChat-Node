import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "@middlewares/authenticate";
import { authorize } from "@middlewares/authorize";

const router = Router();
const ctrl = new UserController();

router.get("/me", authenticate, ctrl.getMe);

router.get("/:id", authenticate, ctrl.getUser);

router.patch("/me", authenticate, ctrl.updateMe);

router.get("/", authenticate, authorize("admin"), ctrl.getAllUsers);
router.delete("/:id", authenticate, authorize("admin"), ctrl.deleteUser);

export default router;
