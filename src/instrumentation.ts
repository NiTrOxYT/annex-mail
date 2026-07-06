export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/config/env");
    validateEnv();

    const { registerDependencies } = await import("@/lib/di/register");
    await registerDependencies();
  }
}
