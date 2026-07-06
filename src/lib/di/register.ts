import { container } from "./container";
import { UserRepository } from "@/repositories/user.repository";
import { OrgRepository } from "@/repositories/org.repository";
import { UserService } from "@/services/user.service";
import { logger } from "@/lib/logger/logger";
import { MemoryCacheProvider } from "@/lib/cache/memory-cache";
import { LocalStorageProvider } from "@/lib/storage/local-storage";
import { EmailProviderFactory } from "@/lib/email/provider.factory";
import { AuditService } from "@/lib/audit/audit.service";

export function registerDependencies() {
  container.register("UserRepository", new UserRepository());
  container.register("OrgRepository", new OrgRepository());
  container.register("UserService", new UserService());
  container.register("Logger", logger);
  container.register("CacheProvider", new MemoryCacheProvider());
  container.register("StorageProvider", new LocalStorageProvider());
  container.register("EmailProvider", EmailProviderFactory.getProvider());
  container.register("AuditService", new AuditService());
}
