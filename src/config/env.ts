/**
 * Environment validation.
 * Called at application startup via registerDependencies().
 * Throws immediately if required variables are missing.
 */

interface EnvVar {
  key: string;
  required: boolean;
  productionOnly?: boolean;
}

const ENV_VARS: EnvVar[] = [
  { key: "DATABASE_URL", required: true },
  { key: "DIRECT_URL", required: true },
  { key: "AUTH_SECRET", required: true },
  { key: "ENCRYPTION_KEY", required: true },
  { key: "GOOGLE_CLIENT_ID", required: true },
  { key: "GOOGLE_CLIENT_SECRET", required: true },
  { key: "BREVO_API_KEY", required: true },
  { key: "BREVO_SMTP_LOGIN", required: true },
  { key: "BREVO_SMTP_PASSWORD", required: true },
  { key: "NEXT_PUBLIC_APP_URL", required: true },
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
