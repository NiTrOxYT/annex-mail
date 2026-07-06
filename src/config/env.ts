/**
 * Environment validation.
 * Called at application startup via registerDependencies().
 * Throws immediately if required variables are missing in production.
 *
 * Rule: only src/config/ reads process.env.
 * All other modules consume typed config objects from this directory.
 */

interface EnvVar {
  key: string;
  required: boolean;
  productionOnly?: boolean;
}

const ENV_VARS: EnvVar[] = [
  // Database
  { key: "DATABASE_URL", required: true },
  { key: "DIRECT_URL", required: true },
  // Authentication
  { key: "AUTH_SECRET", required: true },
  { key: "AUTH_URL", required: true },
  // Encryption
  { key: "ENCRYPTION_KEY", required: true },
  // Google OAuth / Gmail
  { key: "GOOGLE_CLIENT_ID", required: true },
  { key: "GOOGLE_CLIENT_SECRET", required: true },
  // Brevo
  { key: "BREVO_API_KEY", required: true },
  { key: "BREVO_SMTP_LOGIN", required: true },
  { key: "BREVO_SMTP_PASSWORD", required: true },
  // Mailbox
  { key: "MAIL_PRIMARY_ADDRESS", required: true },
  // Application
  { key: "NEXT_PUBLIC_APP_URL", required: true },
  // Supabase
  { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true },
  // Cron (production only)
  { key: "CRON_SECRET", required: true, productionOnly: true },
];

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const missing: string[] = [];

  for (const { key, required, productionOnly } of ENV_VARS) {
    if (!required) continue;
    if (productionOnly && !isProduction) continue;

    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const varList = missing.map((k) => `  - ${k}`).join("\n");
    throw new Error(
      `[Annex Mail] Missing required environment variables:\n${varList}\n\nCheck your .env file or Vercel environment settings.`,
    );
  }
}
