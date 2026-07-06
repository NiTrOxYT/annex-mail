/**
 * Cron / scheduler configuration.
 * CRON_SECRET is server-side only. Never expose to the client.
 */

export const cronConfig = {
  /** Authorization secret for Vercel cron endpoints. Production only. */
  secret: process.env.CRON_SECRET ?? "",
};
