import { Router } from "express";
import { authenticate } from "@middlewares/authenticate";
import { ContactController } from "./contact.controller";

const router = Router();
const ctrl = new ContactController();

router.use(authenticate);

// ── Friend Requests ────────────────────────────────────────
router.post("/requests", ctrl.sendRequest);
router.get("/requests/received", ctrl.getPendingReceived);
router.get("/requests/sent", ctrl.getPendingSent);
router.get("/requests/history", ctrl.getRequestHistory);
router.patch("/requests/:id/accept", ctrl.acceptRequest);
router.patch("/requests/:id/decline", ctrl.declineRequest);
router.patch("/requests/:id/cancel", ctrl.cancelRequest);
router.patch("/requests/:id/seen", ctrl.markRequestSeen);

// ── Contacts ───────────────────────────────────────────────
router.get("/", ctrl.getContacts);
router.get("/favorites", ctrl.getFavorites);
router.get("/search", ctrl.searchContacts);
router.get("/blocked", ctrl.getBlocked);
router.delete("/:userId", ctrl.removeContact);
router.patch("/:id/nickname", ctrl.updateNickname);
router.patch("/:id/favorite", ctrl.toggleFavorite);
router.patch("/:id/mute", ctrl.muteContact);
router.patch("/:id/unmute", ctrl.unmuteContact);
router.post("/block/:userId", ctrl.blockUser);
router.delete("/block/:userId", ctrl.unblockUser);

export default router;
