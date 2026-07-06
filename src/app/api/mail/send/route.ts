import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { MailService } from "@/services/mail.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

import { withRateLimit } from "@/lib/security/rate-limiter";

const sendSchema = z.object({
  accountId: z.string(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required"),
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

async function postHandler(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = sendSchema.parse(body);

    const mailService = container.resolve<MailService>("MailService");
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await mailService.send({
      accountId: parsed.accountId,
      organizationId: session.user.organizationId || "default_org",
      userId: session.user.id,
      userName: session.user.name || "User",
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
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

export const POST = withRateLimit(postHandler, {
  keyPrefix: "mail_send",
  limit: 30,
  windowMs: 60 * 1000,
});
