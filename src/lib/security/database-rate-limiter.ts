import { RateLimiterProvider, RateLimitResult } from "./rate-limiter.interface";
import { db } from "@/lib/db/db";

export class DatabaseRateLimiterProvider implements RateLimiterProvider {
  async limit(
    key: string,
    limitCount: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const resetTime = new Date(now.getTime() + windowMs);

    try {
      const result = await db.$transaction(async (tx) => {
        let record = await tx.rateLimit.findUnique({
          where: { key },
        });

        if (!record || record.resetTime <= now) {
          record = await tx.rateLimit.upsert({
            where: { key },
            create: {
              key,
              points: 1,
              resetTime,
            },
            update: {
              points: 1,
              resetTime,
            },
          });
        } else {
          record = await tx.rateLimit.update({
            where: { key },
            data: {
              points: { increment: 1 },
            },
          });
        }

        return record;
      });

      const success = result.points <= limitCount;
      const remaining = Math.max(0, limitCount - result.points);
      const reset = result.resetTime.getTime();

      return {
        success,
        limit: limitCount,
        remaining,
        reset,
      };
    } catch (err) {
      console.error(
        "[DatabaseRateLimiterProvider] DB rate limiting failed, falling open:",
        err,
      );
      return {
        success: true,
        limit: limitCount,
        remaining: 1,
        reset: now.getTime() + windowMs,
      };
    }
  }
}
