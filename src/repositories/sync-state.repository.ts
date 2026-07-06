import { db } from "@/lib/db/db";
import { Prisma, SyncState } from "@prisma/client";

export class SyncStateRepository {
  async findByEmailAccountId(
    emailAccountId: string,
  ): Promise<SyncState | null> {
    return db.syncState.findUnique({
      where: { emailAccountId },
    });
  }

  async create(data: Prisma.SyncStateUncheckedCreateInput): Promise<SyncState> {
    return db.syncState.create({ data });
  }

  async update(
    emailAccountId: string,
    data: Prisma.SyncStateUpdateInput,
  ): Promise<SyncState> {
    return db.syncState.update({
      where: { emailAccountId },
      data,
    });
  }
}
