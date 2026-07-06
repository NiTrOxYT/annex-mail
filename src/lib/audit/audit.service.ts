import { logger } from "@/lib/logger/logger";
import { SystemEvent } from "@/utils/constants";

export interface LogContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  organizationId?: string;
}

export interface ActivityLogInput {
  userId: string;
  userName: string;
  message: string;
  context?: LogContext;
}

export interface AuditLogInput {
  action: SystemEvent | string;
  message: string;
  context: LogContext;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Write user-facing, human-readable activity log.
   * Example: "Sourik sent an email"
   */
  async logActivity(input: ActivityLogInput): Promise<void> {
    const contextStr = input.context
      ? ` [IP: ${input.context.ipAddress || "N/A"}]`
      : "";
    const logMessage = `[Activity] User: ${input.userName} (${input.userId})${contextStr} - ${input.message}`;

    logger.info(logMessage, "ActivityLog");

    // In Phase 2, this will persist to database.
  }

  /**
   * Write machine-readable developer/security audit log.
   * Example: MAIL_SEND_SUCCESS
   */
  async logAudit(input: AuditLogInput): Promise<void> {
    const timestamp = new Date().toISOString();
    const payload = {
      action: input.action,
      message: input.message,
      timestamp,
      actor: {
        userId: input.context.userId,
        organizationId: input.context.organizationId,
        ipAddress: input.context.ipAddress,
        userAgent: input.context.userAgent,
      },
      metadata: input.metadata || {},
    };

    logger.audit(
      input.action,
      input.context.userId || "SYSTEM",
      `${input.message} - Meta: ${JSON.stringify(payload)}`,
    );

    // In Phase 2, this will persist to database.
  }
}

export const auditService = new AuditService();
