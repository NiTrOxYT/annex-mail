/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlers } from "@/lib/auth/auth";
import { withRateLimit } from "@/lib/security/rate-limiter";

const nextAuthGet = (req: any) => handlers.GET(req);
const nextAuthPost = (req: any) => handlers.POST(req);

export const GET = withRateLimit(nextAuthGet, {
  keyPrefix: "auth_get",
  limit: 100,
  windowMs: 60 * 1000,
});

export const POST = withRateLimit(nextAuthPost, {
  keyPrefix: "auth_post",
  limit: 20,
  windowMs: 60 * 1000,
});
