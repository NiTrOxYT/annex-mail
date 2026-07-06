/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { RateLimiterProvider, RateLimitResult } from "./rate-limiter.interface";

export class UpstashRateLimiterProvider implements RateLimiterProvider {
  private redisClient: any = null;

  private async init() {
    if (this.redisClient) return;

    // Dynamically import @upstash/redis and ignore it during Next.js Turbopack build
    // @ts-ignore
    const { Redis } = await import(
      /* turbopackIgnore: true */ "@upstash/redis"
    );
    this.redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
  }

  async limit(
    key: string,
    limitCount: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    await this.init();

    // Dynamically import @upstash/ratelimit and ignore it during Next.js Turbopack build
    // @ts-ignore
    const { Ratelimit } = await import(
      /* turbopackIgnore: true */ "@upstash/ratelimit"
    );

    const durationSec = Math.ceil(windowMs / 1000);
    const customLimiter = new Ratelimit({
      redis: this.redisClient,
      limiter: Ratelimit.slidingWindow(limitCount, `${durationSec} s`),
    });

    const result = await customLimiter.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
}
