import { z } from "zod";
import { mailboxConfig } from "./mailbox";

const emailConfigSchema = z.object({
  brevoApiKey: z.string().optional(),
  brevoSmtpLogin: z.string().optional(),
  brevoSmtpPassword: z.string().optional(),
});

const parsed = emailConfigSchema.safeParse({
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSmtpLogin: process.env.BREVO_SMTP_LOGIN,
  brevoSmtpPassword: process.env.BREVO_SMTP_PASSWORD,
});

if (!parsed.success) {
  console.warn("Email config validation warning:", parsed.error.format());
}

export const emailConfig = {
  brevo: {
    apiKey: parsed.data?.brevoApiKey ?? "",
    smtpLogin: parsed.data?.brevoSmtpLogin ?? "",
    smtpPassword: parsed.data?.brevoSmtpPassword ?? "",
  },
  /** Resolved from mailboxConfig — use this for from/reply-to headers */
  from: {
    name: mailboxConfig.primary.name,
    address: mailboxConfig.primary.address,
  },
};
