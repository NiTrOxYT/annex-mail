import { EmailProvider } from "./provider.interface";
import { MockEmailProvider } from "./mock/mock.provider";

export class EmailProviderFactory {
  private static activeProvider: EmailProvider | null = null;

  static getProvider(): EmailProvider {
    if (!this.activeProvider) {
      // In Phase 1 we use the Mock provider.
      // Phase 2 will instantiate GmailProvider or BrevoProvider based on config.
      this.activeProvider = new MockEmailProvider();
    }
    return this.activeProvider;
  }
}
