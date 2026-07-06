type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT";

export interface LogPayload {
  message: string;
  context?: string;
  requestId?: string;
  organizationId?: string;
  userId?: string;
  module?: string;
  action?: string;
  provider?: string;
  duration?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

const isProduction = process.env.NODE_ENV === "production";

class Logger {
  private write(level: LogLevel, payload: LogPayload) {
    if (isProduction) {
      // Machine-readable structured JSON for log aggregators (Vercel, Datadog, etc.)
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: payload.message,
        ...(payload.requestId && { requestId: payload.requestId }),
        ...(payload.organizationId && {
          organizationId: payload.organizationId,
        }),
        ...(payload.userId && { userId: payload.userId }),
        ...(payload.module && { module: payload.module }),
        ...(payload.action && { action: payload.action }),
        ...(payload.provider && { provider: payload.provider }),
        ...(payload.duration !== undefined && { duration: payload.duration }),
        ...(payload.status && { status: payload.status }),
        ...(payload.context && { context: payload.context }),
        ...(payload.metadata && { metadata: payload.metadata }),
      };

      switch (level) {
        case "ERROR":
          console.error(JSON.stringify(entry));
          break;
        case "WARN":
          console.warn(JSON.stringify(entry));
          break;
        default:
          console.log(JSON.stringify(entry));
      }
    } else {
      // Human-readable format for development
      const timestamp = new Date().toISOString();
      const contextStr = payload.context ? ` [${payload.context}]` : "";
      const userStr = payload.userId ? ` (User: ${payload.userId})` : "";
      const metaStr = payload.metadata
        ? ` - ${JSON.stringify(payload.metadata)}`
        : "";
      const formatted = `[${timestamp}] [${level}]${contextStr}${userStr}: ${payload.message}${metaStr}`;

      switch (level) {
        case "ERROR":
          console.error(formatted);
          break;
        case "WARN":
          console.warn(formatted);
          break;
        case "AUDIT":
          console.log(`\x1b[35m${formatted}\x1b[0m`);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write("INFO", { message, context, metadata });
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write("WARN", { message, context, metadata });
  }

  error(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write("ERROR", { message, context, metadata });
  }

  structured(level: LogLevel, payload: LogPayload) {
    this.write(level, payload);
  }

  audit(
    action:
      | "LOGIN_SUCCESS"
      | "LOGIN_FAILED"
      | "USER_CREATED"
      | "USER_UPDATED"
      | string,
    userId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    this.write("AUDIT", {
      message: `[${action}] ${message}`,
      userId,
      action,
      metadata,
    });
  }
}

export const logger = new Logger();
