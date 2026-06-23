import { Router } from "express";
import { authenticate } from "@middlewares/authenticate";
import { UserSearchController } from "./user-search.controller";

const router = Router();
const ctrl = new UserSearchController();

router.use(authenticate);

router.get("/", ctrl.search);

router.get("/phone", ctrl.searchByPhone);

router.get("/profile/:userId", ctrl.getUserProfile);

export default router;
