import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { MailService } from "@/services/mail.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { db } from "@/lib/db/db";
import { z } from "zod";

import { withRateLimit } from "@/lib/security/rate-limiter";

const sendSchema = z.object({
  accountId: z.string().optional(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
  html: z.string().optional(),
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
    if (
      !session ||
      !session.user ||
      !session.user.id ||
      !session.user.organizationId
    ) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = sendSchema.parse(body);

    const mailBody = parsed.body ?? parsed.html;
    if (!mailBody) {
      throw new Error("Either body or html content is required");
    }

    // Resolve primary account if not provided
    let accountId = parsed.accountId;
    if (!accountId) {
      const primaryAcc =
        (await db.emailAccount.findFirst({
          where: {
            organizationId: session.user.organizationId,
            isPrimary: true,
          },
        })) ||
        (await db.emailAccount.findFirst({
          where: { organizationId: session.user.organizationId },
        }));

      if (!primaryAcc) {
        throw new Error(
          "No active email accounts registered for this organization.",
        );
      }
      accountId = primaryAcc.id;
    }

    const mailService = container.resolve<MailService>("MailService");
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await mailService.send({
      accountId,
      organizationId: session.user.organizationId,
      userId: session.user.id,
      userName: session.user.name || "User",
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
      body: mailBody,
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
