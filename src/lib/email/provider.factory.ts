import { EmailProvider } from "./provider.interface";
import { BrevoProvider } from "../brevo/brevo.provider";

export class EmailProviderFactory {
  private static activeProvider: EmailProvider | null = null;

  static getProvider(): EmailProvider {
    if (!this.activeProvider) {
      this.activeProvider = new BrevoProvider();
    }
    return this.activeProvider;
  }
}
