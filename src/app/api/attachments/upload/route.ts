import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, ValidationError } from "@/utils/errors";
import { validateAttachment } from "@/lib/security/attachment-validator";
import crypto from "crypto";

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

    // Centralized format and size validation
    const validation = validateAttachment(file.name, file.type, file.size);
    if (!validation.valid) {
      throw new ValidationError(validation.error || "Invalid attachment");
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
