import { storageConfig } from "@/config/storage";
import path from "path";

// Risky file extensions that are banned for security (executable/script vectors)
const BANNED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".js",
  ".vbs",
  ".scr",
  ".msi",
  ".jar",
  ".com",
  ".pif",
  ".gadget",
  ".wsf",
  ".cpl",
  ".reg",
]);

// Allowed common mime types for document sharing
const BANNED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-sh",
  "application/javascript",
  "text/javascript",
  "application/x-chrome-extension",
]);

/**
 * Validates attachment metadata (size, file extension, and mime type).
 */
export function validateAttachment(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): { valid: boolean; error?: string } {
  // 1. Check size limit
  if (sizeBytes > storageConfig.maxFileSize) {
    const maxMb = Math.round(storageConfig.maxFileSize / (1024 * 1024));
    return {
      valid: false,
      error: `Attachment size exceeds the maximum limit of ${maxMb}MB.`,
    };
  }

  // 2. Check file extension
  const ext = path.extname(filename).toLowerCase();
  if (BANNED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Risky file type '${ext}' is not allowed for security reasons.`,
    };
  }

  // 3. Check mime type
  if (BANNED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Risky MIME type '${mimeType}' is not allowed.`,
    };
  }

  return { valid: true };
}
