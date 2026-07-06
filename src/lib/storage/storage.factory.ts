/* eslint-disable @typescript-eslint/ban-ts-comment */
import { StorageProvider } from "./storage.interface";
import { storageConfig } from "@/config/storage";

export class StorageFactory {
  static async getProvider(): Promise<StorageProvider> {
    if (storageConfig.provider === "supabase") {
      const { SupabaseStorageProvider } = await import("./supabase-storage");
      return new SupabaseStorageProvider();
    } else {
      // Dynamic import with ignore comment prevents Turbopack from tracing local-storage.ts in production builds
      // @ts-ignore
      const { LocalStorageProvider } = await import(
        /* turbopackIgnore: true */ "./local-storage"
      );
      return new LocalStorageProvider();
    }
  }
}
