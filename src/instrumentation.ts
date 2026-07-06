export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerDependencies } = await import("@/lib/di/register");
    registerDependencies();

    const { GmailSyncWorker } = await import("@/workers/gmail-sync.worker");
    GmailSyncWorker.init();
  }
}
