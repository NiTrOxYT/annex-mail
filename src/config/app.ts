import { z } from "zod";

const appConfigSchema = z.object({
  url: z.string().url().default("http://localhost:3000"),
  env: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = appConfigSchema.safeParse({
  url: process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL,
  env: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.warn("App config validation warning:", parsed.error.format());
}

export const appConfig = {
  url: parsed.data?.url || "http://localhost:3000",
  env: parsed.data?.env || "development",
};
