export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerDependencies } = await import("@/lib/di/register");
    registerDependencies();
  }
}
