import { z } from "zod";

export const NewsletterSubscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  invitationConsent: z.literal(true),
  marketingConsent: z.boolean().default(false),
  language: z.enum(["en", "es"]).default("en"),
  useCase: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional().default(""),
});
