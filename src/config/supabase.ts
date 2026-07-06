/**
 * Supabase configuration.
 *
 * NEXT_PUBLIC_SUPABASE_URL  — safe to expose to the browser.
 * SUPABASE_SERVICE_ROLE_KEY — server-side only, never expose to the client.
 */

export const supabaseConfig = {
  /** Public project URL. Safe for browser use (storage uploads, realtime, etc.) */
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /** Service role key. Server-side only. */
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  /** Storage bucket for email attachments. */
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "attachments",
};
