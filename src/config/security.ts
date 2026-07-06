import { z } from "zod";

const securityConfigSchema = z.object({
  rateLimitMaxRequests: z.coerce.number().default(100),
  rateLimitWindowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  sessionMaxAge: z.coerce.number().default(24 * 60 * 60), // 24 hours in seconds
  passwordMinLength: z.coerce.number().default(8),
  passwordRequireNumbers: z.coerce.boolean().default(true),
  passwordRequireSymbols: z.coerce.boolean().default(true),
  csrfSecret: z.string().default("csrf_default_secret_for_annex_mail"),
  corsAllowedOrigins: z.string().default("http://localhost:3000"),
});

const parsed = securityConfigSchema.safeParse({
  rateLimitMaxRequests: process.env.SECURITY_RATE_LIMIT_MAX,
  rateLimitWindowMs: process.env.SECURITY_RATE_LIMIT_WINDOW_MS,
  sessionMaxAge: process.env.SECURITY_SESSION_MAX_AGE,
  passwordMinLength: process.env.SECURITY_PASSWORD_MIN_LENGTH,
  passwordRequireNumbers:
    process.env.SECURITY_PASSWORD_REQ_NUMBERS === "true" ? true : undefined,
  passwordRequireSymbols:
    process.env.SECURITY_PASSWORD_REQ_SYMBOLS === "true" ? true : undefined,
  csrfSecret: process.env.SECURITY_CSRF_SECRET,
  corsAllowedOrigins: process.env.SECURITY_CORS_ALLOWED_ORIGINS,
});

if (!parsed.success) {
  console.warn("Security config validation warnings:", parsed.error.format());
}

export const securityConfig = {
  rateLimit: {
    maxRequests: parsed.data?.rateLimitMaxRequests ?? 100,
    windowMs: parsed.data?.rateLimitWindowMs ?? 15 * 60 * 1000,
  },
  session: {
    maxAge: parsed.data?.sessionMaxAge ?? 24 * 60 * 60,
  },
  passwordPolicy: {
    minLength: parsed.data?.passwordMinLength ?? 8,
    requireNumbers: parsed.data?.passwordRequireNumbers ?? true,
    requireSymbols: parsed.data?.passwordRequireSymbols ?? true,
  },
  csrf: {
    secret: parsed.data?.csrfSecret ?? "csrf_default_secret_for_annex_mail",
  },
  cors: {
    allowedOrigins: (
      parsed.data?.corsAllowedOrigins ?? "http://localhost:3000"
    ).split(","),
  },
};
