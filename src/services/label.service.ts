import { container } from "@/lib/di/container";
import { LabelRepository } from "@/repositories/label.repository";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { EmailAccount } from "@prisma/client";

export class LabelService {
  async syncLabels(account: EmailAccount): Promise<void> {
    const labelRepo = container.resolve<LabelRepository>("LabelRepository");
    const provider = ProviderRegistry.getProvider(account.provider);
    const importer = provider.getImporter();
    const normalizer = provider.getNormalizer();

    const rawLabels = await importer.listLabels(account);
    const normalized = await normalizer.normalizeLabels(rawLabels);

    for (const item of normalized) {
      const existing = await labelRepo.findByProviderId(
        account.organizationId,
        item.providerId,
      );
      if (!existing) {
        await labelRepo.create({
          organizationId: account.organizationId,
          name: item.name,
          providerId: item.providerId,
        });
      }
    }
  }
}
export const labelService = new LabelService();
