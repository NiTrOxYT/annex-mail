import fs from "fs/promises";
import path from "path";
import { StorageProvider } from "./storage.interface";
import { storageConfig } from "@/config/storage";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), storageConfig.local.directory);
  }

  private getFullPath(filePath: string): string {
    return path.join(this.baseDir, filePath);
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
  }

  async upload(filePath: string, content: Buffer | string): Promise<string> {
    await this.ensureDirectoryExists(filePath);
    const fullPath = this.getFullPath(filePath);
    await fs.writeFile(fullPath, content);
    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "ENOENT"
      ) {
        throw err;
      }
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
