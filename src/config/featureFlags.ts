import { z } from "zod";

const featureFlagsSchema = z.object({
  aiEnabled: z.coerce.boolean().default(false),
  mailSync: z.coerce.boolean().default(true),
  teamChat: z.coerce.boolean().default(false),
  crm: z.coerce.boolean().default(false),
  tasks: z.coerce.boolean().default(false),
  notifications: z.coerce.boolean().default(true),
});

const parsed = featureFlagsSchema.safeParse({
  aiEnabled: process.env.FEATURE_AI_ENABLED === "true" ? true : undefined,
  mailSync: process.env.FEATURE_MAIL_SYNC === "false" ? false : undefined,
  teamChat: process.env.FEATURE_TEAM_CHAT === "true" ? true : undefined,
  crm: process.env.FEATURE_CRM === "true" ? true : undefined,
  tasks: process.env.FEATURE_TASKS === "true" ? true : undefined,
  notifications:
    process.env.FEATURE_NOTIFICATIONS === "false" ? false : undefined,
});

if (!parsed.success) {
  console.warn(
    "Feature flags config validation warnings:",
    parsed.error.format(),
  );
}

export const featureFlags = {
  AI_ENABLED: parsed.data?.aiEnabled ?? false,
  MAIL_SYNC: parsed.data?.mailSync ?? true,
  TEAM_CHAT: parsed.data?.teamChat ?? false,
  CRM: parsed.data?.crm ?? false,
  TASKS: parsed.data?.tasks ?? false,
  NOTIFICATIONS: parsed.data?.notifications ?? true,
};
export type FeatureFlags = typeof featureFlags;
