import { z } from "zod";

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    formatted[path] = issue.message;
  }
  return formatted;
}
