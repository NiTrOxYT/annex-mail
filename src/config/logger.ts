import { z } from "zod";

const loggerConfigSchema = z.object({
  minLevel: z.enum(["INFO", "WARN", "ERROR", "AUDIT"]).default("INFO"),
  enableConsole: z.coerce.boolean().default(true),
  enableDbStorage: z.coerce.boolean().default(false),
});

const parsed = loggerConfigSchema.safeParse({
  minLevel: process.env.LOGGER_MIN_LEVEL,
  enableConsole:
    process.env.LOGGER_ENABLE_CONSOLE === "false" ? false : undefined,
  enableDbStorage:
    process.env.LOGGER_ENABLE_DB_STORAGE === "true" ? true : undefined,
});

if (!parsed.success) {
  console.warn("Logger config validation warnings:", parsed.error.format());
}

export const loggerConfig = {
  minLevel: parsed.data?.minLevel ?? "INFO",
  enableConsole: parsed.data?.enableConsole ?? true,
  enableDbStorage: parsed.data?.enableDbStorage ?? false,
};
export type LoggerConfig = typeof loggerConfig;
