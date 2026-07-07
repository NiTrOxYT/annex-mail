import { db } from "@/lib/db/db";
import { container, ensureInitialized } from "@/lib/di/container";
import { QueueProvider } from "@/lib/queue/queue.interface";
import { logger } from "@/lib/logger/logger";
import { withRateLimit } from "@/lib/security/rate-limiter";
import { historyService } from "@/services/history.service";

async function postHandler(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: { data?: string };
    };
    logger.info(
      "Received Google Pub/Sub push notification webhook",
      "GmailWebhook",
    );

    const message = body.message;
    if (!message || !message.data) {
      return new Response("Invalid Pub/Sub message structure", { status: 400 });
    }

    const decodedStr = Buffer.from(message.data, "base64").toString("utf8");
    const payload = JSON.parse(decodedStr) as {
      emailAddress?: string;
      historyId?: number | string;
    };

    const emailAddress = payload.emailAddress;
    const historyId = payload.historyId;

    if (!emailAddress || !historyId) {
      return new Response("Missing parameters in payload", { status: 400 });
    }

    const account = await db.emailAccount.findUnique({
      where: { email: emailAddress },
    });

    if (!account) {
      logger.warn(
        `Account not configured for incoming webhook email: ${emailAddress}`,
        "GmailWebhook",
      );
      return new Response("Email account not configured", { status: 200 });
    }

    await ensureInitialized();
    const queue = container.resolve<QueueProvider>("QueueProvider");
    await queue.enqueue("history-sync", {
      emailAccountId: account.id,
      startHistoryId: String(historyId),
    });

    try {
      await historyService.processHistorySync(account, String(historyId));
      logger.info(
        `Successfully processed webhook push sync inline for ${emailAddress}`,
        "GmailWebhook",
      );
    } catch (syncErr) {
      logger.error(
        `Failed to process webhook push sync inline for ${emailAddress}`,
        "GmailWebhook",
        {
          error: String(syncErr),
        },
      );
    }

    return new Response("Acknowledged", { status: 200 });
  } catch (err) {
    logger.error("Error processing Pub/Sub push webhook", "GmailWebhook", {
      error: String(err),
    });
    return new Response("Internal server error", { status: 500 });
  }
}

export const POST = withRateLimit(postHandler, {
  keyPrefix: "gmail_webhook",
  limit: 200, // higher limit since webhook pushes can be bursty
  windowMs: 60 * 1000,
});
