import { MailProvider } from "./provider.interface";
import { gmailProvider } from "./gmail/gmail.provider";

export class ProviderRegistry {
  private static providers = new Map<string, MailProvider>([
    ["gmail", gmailProvider],
  ]);

  static getProvider(name: string): MailProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Provider ${name} not found in registry`);
    }
    return provider;
  }
}
