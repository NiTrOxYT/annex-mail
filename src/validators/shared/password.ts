import { z } from "zod";
import { securityConfig } from "@/config/security";

export const passwordValidator = z
  .string()
  .min(1, "Password is required")
  .min(
    securityConfig.passwordPolicy.minLength,
    `Password must be at least ${securityConfig.passwordPolicy.minLength} characters`,
  )
  .refine((val) => {
    if (securityConfig.passwordPolicy.requireNumbers && !/\d/.test(val)) {
      return false;
    }
    return true;
  }, "Password must contain at least one number")
  .refine((val) => {
    if (
      securityConfig.passwordPolicy.requireSymbols &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(val)
    ) {
      return false;
    }
    return true;
  }, "Password must contain at least one special character");
