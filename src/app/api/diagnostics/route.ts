import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { googleConfig } from "@/config/google";

export async function GET() {
  const start = Date.now();
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "OWNER") {
      throw new AuthenticationError(
        "Unauthorized: Only Owners can view diagnostics.",
      );
    }

    const orgId = session.user.organizationId!;

    // Benchmark DB read
    const dbStart = Date.now();
    const [
      account,
      messagesCount,
      conversationsCount,
      queuedJobs,
      processingJobs,
      failedJobs,
      lastJobs,
    ] = await Promise.all([
      db.emailAccount.findFirst({
        where: { organizationId: orgId },
        include: {
          syncState: true,
          watchState: true,
        },
      }),
      db.message.count({ where: { conversation: { organizationId: orgId } } }),
      db.conversation.count({ where: { organizationId: orgId } }),
      db.jobRecord.count({ where: { status: "queued" } }),
      db.jobRecord.count({ where: { status: "processing" } }),
      db.jobRecord.count({ where: { status: "failed" } }),
      db.jobRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    const dbDuration = Date.now() - dbStart;

    // Build the diagnostic status report
    const pubSubTopic = googleConfig.pubSubTopic || "";
    const isPubSubConfigured =
      pubSubTopic.length > 0 && !pubSubTopic.includes("your-project-id");

    const diagnostics = {
      oauth: {
        connected: !!account,
        email: account?.email || null,
        status: account?.status || "NOT_CONNECTED",
        tokenExpiration: account?.expiresAt
          ? new Date(account.expiresAt).toISOString()
          : null,
        tokenExpired: account?.expiresAt
          ? new Date(account.expiresAt).getTime() < Date.now()
          : false,
      },
      watch: {
        configured: !!account?.watchState,
        resourceId: account?.watchState?.resourceId || null,
        expiration: account?.watchState?.expiration
          ? new Date(account.watchState.expiration).toISOString()
          : null,
        expired: account?.watchState?.expiration
          ? new Date(account.watchState.expiration).getTime() < Date.now()
          : false,
      },
      pubsub: {
        configured: isPubSubConfigured,
        topic: pubSubTopic || null,
      },
      webhook: {
        configured: !!process.env.AUTH_URL || !!process.env.NEXTAUTH_URL,
        url: process.env.AUTH_URL || process.env.NEXTAUTH_URL || null,
      },
      sync: {
        status: account?.syncState?.status || "IDLE",
        lastHistoryId: account?.syncState?.historyId || null,
        lastSuccessfulSync: account?.syncState?.lastSuccessfulSync
          ? new Date(account.syncState.lastSuccessfulSync).toISOString()
          : null,
        lastError:
          account?.syncState?.status === "FAILED"
            ? "Last synchronization attempt failed"
            : null,
      },
      database: {
        messagesImported: messagesCount,
        conversationsImported: conversationsCount,
      },
      queue: {
        queued: queuedJobs,
        processing: processingJobs,
        failed: failedJobs,
        recentJobs: lastJobs.map((j) => ({
          id: j.id,
          name: j.name,
          status: j.status,
          attempts: j.attempts,
          error: j.error,
          createdAt: j.createdAt.toISOString(),
        })),
      },
      performance: {
        dbResponseTimeMs: dbDuration,
        apiTotalDurationMs: Date.now() - start,
      },
    };

    return ApiResponse.success(diagnostics);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
