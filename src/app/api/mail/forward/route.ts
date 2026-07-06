import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { MailService } from "@/services/mail.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

import { withRateLimit } from "@/lib/security/rate-limiter";

const forwardSchema = z.object({
  originalMessageId: z.string(),
  to: z.array(z.string().email()),
  comment: z.string().optional(),
});

async function postHandler(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = forwardSchema.parse(body);

    const mailService = container.resolve<MailService>("MailService");
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await mailService.forward({
      originalMessageId: parsed.originalMessageId,
      userId: session.user.id,
      userName: session.user.name || "User",
      to: parsed.to,
      comment: parsed.comment,
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
  keyPrefix: "mail_forward",
  limit: 30,
  windowMs: 60 * 1000,
});
