import { z } from "zod";

export const emailValidator = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address format")
  .min(5, "Email is too short")
  .max(255, "Email is too long")
  .trim()
  .toLowerCase();
