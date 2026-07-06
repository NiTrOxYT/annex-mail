export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiterProvider {
  limit(
    key: string,
    limitCount: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
}
