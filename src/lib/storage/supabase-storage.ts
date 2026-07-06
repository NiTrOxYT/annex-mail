import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageProvider } from "./storage.interface";

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";

    if (!url || !key) {
      throw new Error(
        "SupabaseStorageProvider: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      );
    }

    this.client = createClient(url, key);
  }

  async upload(filePath: string, content: Buffer | string): Promise<string> {
    const data =
      typeof content === "string" ? Buffer.from(content, "utf-8") : content;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(filePath, data, { upsert: true });

    if (error) {
      throw new Error(
        `SupabaseStorageProvider upload failed: ${error.message}`,
      );
    }

    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(filePath);

    if (error || !data) {
      throw new Error(
        `SupabaseStorageProvider download failed: ${error?.message ?? "No data"}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(filePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(
        `SupabaseStorageProvider delete failed: ${error.message}`,
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const dir = filePath.split("/").slice(0, -1).join("/");
    const filename = filePath.split("/").at(-1);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(dir, { search: filename });

    if (error) return false;
    return (data?.length ?? 0) > 0;
  }
}
