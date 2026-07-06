import { auth } from "@/lib/auth/auth";
import { container, ensureInitialized } from "@/lib/di/container";
import { TemplateRepository } from "@/repositories/template.repository";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, NotFoundError } from "@/utils/errors";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
  variables: z.array(z.string()).optional(),
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
    await ensureInitialized();
    const templateRepo =
      container.resolve<TemplateRepository>("TemplateRepository");
    const template = await templateRepo.findById(resolvedParams.id);
    if (!template) {
      throw new NotFoundError("Template not found");
    }

    if (template.organizationId !== session.user.organizationId) {
      throw new AuthenticationError(
        "Unauthorized access to organization template",
      );
    }

    const body = await req.json();
    const parsed = updateTemplateSchema.parse(body);

    const updated = await templateRepo.update(resolvedParams.id, {
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      subject: parsed.subject,
      html: parsed.html,
      variables: parsed.variables,
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
    await ensureInitialized();
    const templateRepo =
      container.resolve<TemplateRepository>("TemplateRepository");
    const template = await templateRepo.findById(resolvedParams.id);
    if (!template) {
      throw new NotFoundError("Template not found");
    }

    if (template.organizationId !== session.user.organizationId) {
      throw new AuthenticationError(
        "Unauthorized access to organization template",
      );
    }

    await templateRepo.delete(resolvedParams.id);

    return ApiResponse.success({
      id: resolvedParams.id,
      message: "Template deleted successfully",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
