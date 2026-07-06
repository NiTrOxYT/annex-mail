/* eslint-disable @typescript-eslint/no-explicit-any */
import { container } from "@/lib/di/container";
import { RateLimiterProvider } from "./rate-limiter.interface";

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
  try {
    const provider = container.resolve<RateLimiterProvider>(
      "RateLimiterProvider",
    );
    return await provider.limit(key, limitCount, windowMs);
  } catch (err) {
    console.error(
      "[RateLimiter] Failed to resolve RateLimiterProvider, falling open:",
      err,
    );
    return {
      success: true,
      limit: limitCount,
      remaining: 1,
      reset: Date.now() + windowMs,
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
