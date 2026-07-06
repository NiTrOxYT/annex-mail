/**
 * DI Container — lazy-init singleton.
 *
 * Guarantees that `registerDependencies()` runs BEFORE the first `resolve()`
 * regardless of whether `instrumentation.ts` has completed yet.
 *
 * This fixes Vercel serverless cold-start races where instrumentation may not
 * have finished executing before a route handler calls `container.resolve()`.
 */

let initPromise: Promise<void> | null = null;
let initialized = false;

class Container {
  private readonly deps = new Map<string, unknown>();
  private readonly factories = new Map<string, () => unknown>();

  register<T>(token: string, dependency: T): void {
    this.deps.set(token, dependency);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory as () => unknown);
  }

  /**
   * Synchronous resolve — throws if dependency not registered.
   * Use after ensureInitialized() has been awaited.
   */
  resolve<T>(token: string): T {
    if (this.deps.has(token)) {
      return this.deps.get(token) as T;
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      this.deps.set(token, instance); // cache singleton
      return instance as T;
    }

    throw new Error(`Dependency not registered: ${token}`);
  }

  clear(): void {
    this.deps.clear();
    this.factories.clear();
    initialized = false;
    initPromise = null;
  }

  get isInitialized(): boolean {
    return initialized;
  }
}

export const container = new Container();

/**
 * Ensures `registerDependencies()` has run exactly once.
 * Called automatically by `resolveAsync()` and can be called explicitly
 * from route handlers that need a guaranteed-ready container.
 *
 * Safe to call multiple times — idempotent.
 */
export async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      const { registerDependencies } = await import("./register");
      await registerDependencies();
      initialized = true;
    })();
  }

  await initPromise;
}

/**
 * Async resolve — guaranteed to work even on a cold start.
 * Prefer this in Route Handlers over the synchronous `container.resolve()`.
 */
export async function resolveAsync<T>(token: string): Promise<T> {
  await ensureInitialized();
  return container.resolve<T>(token);
}
