import {
  MailProvider,
  MailImporter,
  MailNormalizer,
  MailWatcher,
  MailHistoryProvider,
} from "../provider.interface";
import { gmailImporter } from "./gmail.importer";
import { gmailNormalizer } from "./gmail.normalizer";
import { gmailWatch } from "./gmail.watch";
import { gmailHistory } from "./gmail.history";

export class GmailProvider implements MailProvider {
  getImporter(): MailImporter {
    return gmailImporter;
  }

  getNormalizer(): MailNormalizer {
    return gmailNormalizer;
  }

  getWatcher(): MailWatcher {
    return gmailWatch;
  }

  getHistoryProvider(): MailHistoryProvider {
    return gmailHistory;
  }
}
export const gmailProvider = new GmailProvider();
