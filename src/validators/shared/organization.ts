import { z } from "zod";

export const organizationNameValidator = z
  .string()
  .min(1, "Organization name is required")
  .min(2, "Organization name must be at least 2 characters")
  .max(100, "Organization name is too long")
  .trim();

export const organizationSlugValidator = z
  .string()
  .min(1, "Organization slug is required")
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug is too long")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must only contain lowercase alphanumeric characters and hyphens",
  )
  .trim();
