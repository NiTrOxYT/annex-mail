import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { MailService } from "@/services/mail.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

const replySchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1, "Body is required"),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        storagePath: z.string(),
        content: z.string(), // Base64 encoding
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = replySchema.parse(body);

    const mailService = container.resolve<MailService>("MailService");
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await mailService.reply({
      conversationId: parsed.conversationId,
      userId: session.user.id,
      userName: session.user.name || "User",
      body: parsed.body,
      attachments: parsed.attachments,
      context: { ipAddress, userAgent },
    });

    if (!result.success) {
      throw result.error;
    }

    return ApiResponse.success(result.value);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
