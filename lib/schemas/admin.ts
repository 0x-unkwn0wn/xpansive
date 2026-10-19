import { z } from "zod";

export const AdminInvitationBatchSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email().max(320)).min(1).max(50),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const AdminAccessStatusSchema = z.object({ status: z.enum(["pending", "active", "revoked"]) });
