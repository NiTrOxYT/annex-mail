import { db } from "@/lib/db/db";
import { Prisma, WatchState } from "@prisma/client";

export class WatchStateRepository {
  async findByEmailAccountId(
    emailAccountId: string,
  ): Promise<WatchState | null> {
    return db.watchState.findUnique({
      where: { emailAccountId },
    });
  }

  async create(
    data: Prisma.WatchStateUncheckedCreateInput,
  ): Promise<WatchState> {
    return db.watchState.create({ data });
  }

  async update(
    emailAccountId: string,
    data: Prisma.WatchStateUpdateInput,
  ): Promise<WatchState> {
    return db.watchState.update({
      where: { emailAccountId },
      data,
    });
  }

  async delete(emailAccountId: string): Promise<WatchState> {
    return db.watchState.delete({
      where: { emailAccountId },
    });
  }
}
