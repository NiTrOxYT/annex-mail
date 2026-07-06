import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { storageConfig } from "@/config/storage";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, ValidationError } from "@/utils/errors";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/zip",
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (
      !session ||
      !session.user ||
      !session.user.id ||
      !session.user.organizationId
    ) {
      throw new AuthenticationError("User is not authenticated");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    // Size check
    if (file.size > storageConfig.maxFileSize) {
      throw new ValidationError(
        `File exceeds size limit of ${
          storageConfig.maxFileSize / 1024 / 1024
        }MB`,
      );
    }

    // Format validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new ValidationError(`Unsupported file type: ${file.type}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save using DI resolved StorageProvider
    const storage = container.resolve<StorageProvider>("StorageProvider");
    const uniqueFilename = `${crypto.randomUUID()}_${file.name}`;
    const storagePath = `orgs/${session.user.organizationId}/attachments/${uniqueFilename}`;

    const savedPath = await storage.upload(storagePath, buffer);

    return ApiResponse.success({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: savedPath,
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
