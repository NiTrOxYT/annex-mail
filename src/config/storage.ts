import { z } from "zod";

const storageConfigSchema = z.object({
  provider: z.enum(["local", "supabase", "s3", "r2"]).default("local"),
  localDirectory: z.string().default(".uploads"),
  maxFileSize: z.coerce.number().default(10 * 1024 * 1024), // 10MB default
});

const parsed = storageConfigSchema.safeParse({
  provider: process.env.STORAGE_PROVIDER,
  localDirectory: process.env.STORAGE_LOCAL_DIR,
  maxFileSize: process.env.STORAGE_MAX_FILE_SIZE,
});

if (!parsed.success) {
  console.warn("Storage config validation warnings:", parsed.error.format());
}

export const storageConfig = {
  provider: parsed.data?.provider ?? "local",
  local: {
    directory: parsed.data?.localDirectory ?? ".uploads",
  },
  maxFileSize: parsed.data?.maxFileSize ?? 10 * 1024 * 1024,
};
