import { z } from "zod";

export const AuthEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  next: z.string().max(2048).optional(),
});

export const InvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});
