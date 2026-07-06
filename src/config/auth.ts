import { z } from "zod";

const authConfigSchema = z.object({
  secret: z
    .string()
    .min(1, "AUTH_SECRET is required for security")
    .optional()
    .or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
});

const parsed = authConfigSchema.safeParse({
  secret: process.env.AUTH_SECRET,
  url: process.env.AUTH_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

if (!parsed.success) {
  console.warn("Auth config validation warning:", parsed.error.format());
}

export const authConfig = {
  secret:
    parsed.data?.secret ||
    process.env.AUTH_SECRET ||
    "fallback_development_secret_only",
  url: parsed.data?.url || "",
  google: {
    clientId: parsed.data?.googleClientId || "",
    clientSecret: parsed.data?.googleClientSecret || "",
  },
};
