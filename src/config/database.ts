import { z } from "zod";

const databaseConfigSchema = z.object({
  url: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string")
    .optional()
    .or(z.literal("")),
});

const parsed = databaseConfigSchema.safeParse({
  url: process.env.DATABASE_URL,
});

if (!parsed.success) {
  console.warn("Database config warning:", parsed.error.format());
}

export const databaseConfig = {
  url: parsed.data?.url || "",
};
