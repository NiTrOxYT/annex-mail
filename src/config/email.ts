import { z } from "zod";

const emailConfigSchema = z.object({
  brevoApiKey: z.string().optional(),
  brevoSmtpLogin: z.string().optional(),
  brevoSmtpPassword: z.string().optional(),
  fromName: z.string().default("Annex"),
  fromAddress: z.string().email().default("business@annex-consultancy.com"),
});

const parsed = emailConfigSchema.safeParse({
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSmtpLogin: process.env.BREVO_SMTP_LOGIN,
  brevoSmtpPassword: process.env.BREVO_SMTP_PASSWORD,
  fromName: process.env.EMAIL_FROM_NAME,
  fromAddress: process.env.EMAIL_FROM_ADDRESS,
});

if (!parsed.success) {
  console.warn("Email config validation warning:", parsed.error.format());
}

export const emailConfig = {
  brevo: {
    apiKey: parsed.data?.brevoApiKey || "",
    smtpLogin: parsed.data?.brevoSmtpLogin || "",
    smtpPassword: parsed.data?.brevoSmtpPassword || "",
  },
  from: {
    name: parsed.data?.fromName || "Annex",
    address: parsed.data?.fromAddress || "business@annex-consultancy.com",
  },
};
