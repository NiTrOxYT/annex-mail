import { auth } from "@/lib/auth/auth";
import { container, ensureInitialized } from "@/lib/di/container";
import { TemplateRepository } from "@/repositories/template.repository";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "HTML body is required"),
  variables: z.array(z.string()).default([]),
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
    const templateRepo =
      container.resolve<TemplateRepository>("TemplateRepository");
    const templates = await templateRepo.listByOrg(session.user.organizationId);

    return ApiResponse.success(templates);
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
    const parsed = createTemplateSchema.parse(body);

    await ensureInitialized();
    const templateRepo =
      container.resolve<TemplateRepository>("TemplateRepository");
    const template = await templateRepo.create({
      organizationId: session.user.organizationId,
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      subject: parsed.subject,
      html: parsed.html,
      variables: parsed.variables,
      createdBy: session.user.id,
    });

    return ApiResponse.success(template);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
