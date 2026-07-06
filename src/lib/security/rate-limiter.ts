/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db/db";

// Dynamic import support for Upstash Redis if present
let upstashRatelimit: any = null;
let upstashRedis: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  upstashRatelimit = require("@upstash/ratelimit");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  upstashRedis = require("@upstash/redis");
} catch {
  // Upstash not installed, fallback to DB
}

let redisClient: any = null;

if (
  upstashRatelimit &&
  upstashRedis &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redisClient = new upstashRedis.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function limitRequest(
  key: string,
  limitCount: number,
  windowMs: number,
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If Upstash is configured, use it
  if (redisClient && upstashRatelimit) {
    try {
      const durationSec = Math.ceil(windowMs / 1000);
      const customLimiter = new upstashRatelimit.Ratelimit({
        redis: redisClient,
        limiter: upstashRatelimit.Ratelimit.slidingWindow(
          limitCount,
          `${durationSec} s`,
        ),
      });
      const result = await customLimiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      console.error(
        "[RateLimiter] Redis rate limiting failed, falling back to DB:",
        err,
      );
    }
  }

  // Fallback to database-backed rate limiter
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
    console.error("[RateLimiter] DB rate limiting failed, falling open:", err);
    return {
      success: true,
      limit: limitCount,
      remaining: 1,
      reset: now.getTime() + windowMs,
    };
  }
}

export function withRateLimit(
  handler: (req: any, ...args: any[]) => Promise<any>,
  options: { keyPrefix: string; limit: number; windowMs: number },
) {
  return async (req: any, ...args: any[]) => {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const key = `${options.keyPrefix}_${ip}`;
    const result = await limitRequest(key, options.limit, options.windowMs);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            name: "RateLimitError",
            message: "Too many requests. Please try again later.",
            statusCode: 429,
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        },
      );
    }

    const response = await handler(req, ...args);
    try {
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.reset));
    } catch {
      // In case the response headers are immutable, we just return it
    }
    return response;
  };
}
