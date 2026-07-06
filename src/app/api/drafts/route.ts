import { auth } from "@/lib/auth/auth";
import { container, ensureInitialized } from "@/lib/di/container";
import { DraftRepository } from "@/repositories/draft.repository";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

const createDraftSchema = z.object({
  to: z.array(z.string().email()).default([]),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().optional(),
  html: z.string().optional(),
});

export async function GET() {
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

    await ensureInitialized();
    const draftRepo = container.resolve<DraftRepository>("DraftRepository");
    const drafts = await draftRepo.listByOrg(session.user.organizationId);

    return ApiResponse.success(drafts);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}

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

    const body = await req.json();
    const parsed = createDraftSchema.parse(body);

    const draftRepo = container.resolve<DraftRepository>("DraftRepository");
    const draft = await draftRepo.create({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
      html: parsed.html,
    });

    return ApiResponse.success(draft);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
