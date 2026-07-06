export interface AppEvent<T = unknown> {
  name: string;
  timestamp: Date;
  payload: T;
}

export type EventHandler<T = unknown> = (
  event: AppEvent<T>,
) => Promise<void> | void;

export interface IEventBus {
  publish<T = unknown>(event: AppEvent<T>): Promise<void>;
  subscribe<T = unknown>(eventName: string, handler: EventHandler<T>): void;
  unsubscribe<T = unknown>(eventName: string, handler: EventHandler<T>): void;
}

export class EventBus implements IEventBus {
  // Use unknown for internal storage to avoid eslint explicit any checks
  private handlers = new Map<string, Set<EventHandler<unknown>>>();

  async publish<T = unknown>(event: AppEvent<T>): Promise<void> {
    const eventHandlers = this.handlers.get(event.name);
    if (!eventHandlers) return;

    const promises = Array.from(eventHandlers).map(async (handler) => {
      try {
        // Cast event to match handler input shape safely
        await handler(event as AppEvent<unknown>);
      } catch (err) {
        console.error(
          `[EventBus] Error executing handler for event ${event.name}:`,
          err,
        );
      }
    });

    await Promise.all(promises);
  }

  subscribe<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers
      .get(eventName)!
      .add(handler as unknown as EventHandler<unknown>);
  }

  unsubscribe<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler as unknown as EventHandler<unknown>);
    }
  }
}
export const eventBus = new EventBus();
