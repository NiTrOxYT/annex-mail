type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT";

interface LogPayload {
  message: string;
  context?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private formatMessage(level: LogLevel, payload: LogPayload): string {
    const timestamp = new Date().toISOString();
    const contextStr = payload.context ? ` [${payload.context}]` : "";
    const userIdStr = payload.userId ? ` (User: ${payload.userId})` : "";
    const metaStr = payload.metadata
      ? ` - ${JSON.stringify(payload.metadata)}`
      : "";
    return `[${timestamp}] [${level}]${contextStr}${userIdStr}: ${payload.message}${metaStr}`;
  }

  private write(level: LogLevel, payload: LogPayload) {
    const formatted = this.formatMessage(level, payload);
    switch (level) {
      case "ERROR":
        console.error(formatted);
        break;
      case "WARN":
        console.warn(formatted);
        break;
      case "AUDIT":
        console.log(`\x1b[35m${formatted}\x1b[0m`); // Magenta color for audit logs
        break;
      case "INFO":
      default:
        console.log(formatted);
        break;
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
      metadata,
    });
  }
}

export const logger = new Logger();
