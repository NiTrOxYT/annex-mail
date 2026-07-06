class Container {
  private dependencies = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  register<T>(token: string, dependency: T): void {
    this.dependencies.set(token, dependency);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory as () => unknown);
  }

  resolve<T>(token: string): T {
    if (this.dependencies.has(token)) {
      return this.dependencies.get(token) as T;
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const dependency = factory();
      this.dependencies.set(token, dependency); // Cache singleton instances
      return dependency as T;
    }

    throw new Error(`Dependency not registered: ${token}`);
  }

  clear(): void {
    this.dependencies.clear();
    this.factories.clear();
  }
}

export const container = new Container();
