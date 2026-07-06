import { auth } from "@/lib/auth/auth";
import { container } from "@/lib/di/container";
import { DraftRepository } from "@/repositories/draft.repository";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, NotFoundError } from "@/utils/errors";
import { z } from "zod";

const updateDraftSchema = z.object({
  to: z.array(z.string().email()).optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
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

    const resolvedParams = await params;
    const draftRepo = container.resolve<DraftRepository>("DraftRepository");
    const draft = await draftRepo.findById(resolvedParams.id);
    if (!draft) {
      throw new NotFoundError("Draft not found");
    }

    if (draft.organizationId !== session.user.organizationId) {
      throw new AuthenticationError(
        "Unauthorized access to organization draft",
      );
    }

    const body = await req.json();
    const parsed = updateDraftSchema.parse(body);

    const updated = await draftRepo.update(resolvedParams.id, {
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
      html: parsed.html,
    });

    return ApiResponse.success(updated);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
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

    const resolvedParams = await params;
    const draftRepo = container.resolve<DraftRepository>("DraftRepository");
    const draft = await draftRepo.findById(resolvedParams.id);
    if (!draft) {
      throw new NotFoundError("Draft not found");
    }

    if (draft.organizationId !== session.user.organizationId) {
      throw new AuthenticationError(
        "Unauthorized access to organization draft",
      );
    }

    await draftRepo.delete(resolvedParams.id);

    return ApiResponse.success({
      id: resolvedParams.id,
      message: "Draft deleted successfully",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
