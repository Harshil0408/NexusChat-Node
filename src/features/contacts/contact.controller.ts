import { Request, Response } from "express";
import { ContactService } from "./contact.service";
import { asyncHandler } from "@shared/asyncHandler";
import { sendSuccess } from "@shared/response";

export class ContactController {
  constructor(private service = new ContactService()) {}

  // ── Friend Requests ────────────────────────────────────────

  sendRequest = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.sendFriendRequest(
      req.user!.userId,
      req.body,
    );
    sendSuccess(res, result, 201, undefined, "Friend request sent");
  });

  acceptRequest = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.acceptFriendRequest(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, result, 200, undefined, "Friend request accepted");
  });

  declineRequest = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.declineFriendRequest(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, result, 200, undefined, "Friend request declined");
  });

  cancelRequest = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.cancelFriendRequest(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, result, 200, undefined, "Friend request cancelled");
  });

  markRequestSeen = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markRequestSeen(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, null, 200, undefined, "Marked as seen");
  });

  getPendingReceived = asyncHandler(async (req: Request, res: Response) => {
    const requests = await this.service.getPendingReceived(req.user!.userId);
    sendSuccess(res, requests);
  });

  getPendingSent = asyncHandler(async (req: Request, res: Response) => {
    const requests = await this.service.getPendingSent(req.user!.userId);
    sendSuccess(res, requests);
  });

  getRequestHistory = asyncHandler(async (req: Request, res: Response) => {
    const history = await this.service.getRequestHistory(req.user!.userId);
    sendSuccess(res, history);
  });

  // ── Contacts ───────────────────────────────────────────────

  getContacts = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await this.service.getContacts(req.user!.userId);
    sendSuccess(res, contacts);
  });

  getFavorites = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await this.service.getFavoriteContacts(req.user!.userId);
    sendSuccess(res, contacts);
  });

  searchContacts = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await this.service.searchContacts(
      req.user!.userId,
      req.query.q as string,
    );
    sendSuccess(res, contacts);
  });

  updateNickname = asyncHandler(async (req: Request, res: Response) => {
    const contact = await this.service.updateNickname(
      req.params.id as string,
      req.user!.userId,
      req.body.nickname ?? null,
    );
    sendSuccess(res, contact, 200, undefined, "Nickname updated");
  });

  toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
    const contact = await this.service.toggleFavorite(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, contact, 200, undefined, "Favorite updated");
  });

  muteContact = asyncHandler(async (req: Request, res: Response) => {
    const contact = await this.service.muteContact(
      req.params.id as string,
      req.user!.userId,
      req.body.muted_until,
    );
    sendSuccess(res, contact, 200, undefined, "Contact muted");
  });

  unmuteContact = asyncHandler(async (req: Request, res: Response) => {
    const contact = await this.service.unmuteContact(
      req.params.id as string,
      req.user!.userId,
    );
    sendSuccess(res, contact, 200, undefined, "Contact unmuted");
  });

  blockUser = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.blockContact(
      req.user!.userId,
      req.params.userId as string,
    );
    sendSuccess(res, result, 200, undefined, "User blocked");
  });

  unblockUser = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.unblockContact(
      req.user!.userId,
      req.params.userId as string,
    );
    sendSuccess(res, result, 200, undefined, "User unblocked");
  });

  getBlocked = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await this.service.getBlockedContacts(req.user!.userId);
    sendSuccess(res, contacts);
  });

  removeContact = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.removeContact(
      req.user!.userId,
      req.params.userId as string,
    );
    sendSuccess(res, result, 200, undefined, "Contact removed");
  });
}
