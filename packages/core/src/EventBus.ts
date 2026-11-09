import type { WorksheetId } from './workbook-access-types';

export type EventHandler = (payload: unknown) => void;
export type BridgeEmit = (payload: unknown) => void;

export type WorkbookRowHeightChangeEvent = {
  worksheetId: WorksheetId;
  row: number;
  heightPx: number;
};

export type WorkbookColumnWidthChangeEvent = {
  worksheetId: WorksheetId;
  column: number;
  widthPx: number;
};

type EventPayload<Event extends string> =
  Event extends 'row-height-change' ? WorkbookRowHeightChangeEvent :
  Event extends 'column-width-change' ? WorkbookColumnWidthChangeEvent : unknown;
type EventHandlerFor<Event extends string> = (payload: EventPayload<Event>) => void;

export interface EventAPI {
  on<Event extends string>(event: Event, handler: EventHandlerFor<Event>): () => void;
  once<Event extends string>(event: Event, handler: EventHandlerFor<Event>): void;
  off<Event extends string>(event: Event, handler: EventHandlerFor<Event>): void;
}

type BridgeActivation = {
  activate: (emit: BridgeEmit) => void;
  deactivate: () => void;
};

export class EventBus implements EventAPI {
  private listeners = new Map<string, Set<EventHandler>>();
  private bridgeActivations = new Map<string, BridgeActivation>();
  private activeBridges = new Set<string>();

  constructor(
    private readonly reportListenerError: (error: unknown, event: string) => void = (error, event) => {
      console.error(`EventBus listener failed for '${event}'`, error);
    },
    private readonly shouldContinue: () => boolean = () => true,
    private readonly isolateListenerFailures = false,
  ) {}

  registerBridge(
    event: string,
    activate: (emit: BridgeEmit) => void,
    deactivate: () => void,
  ): void {
    this.bridgeActivations.set(event, { activate, deactivate });
  }

  isBridgeActive(event: string): boolean {
    return this.activeBridges.has(event);
  }

  getActiveBridgeEvents(): string[] {
    return Array.from(this.activeBridges);
  }

  reactivateBridge(event: string): void {
    if (!this.activeBridges.has(event)) return;
    const bridge = this.bridgeActivations.get(event);
    if (!bridge) return;
    bridge.deactivate();
    bridge.activate((payload) => this.emit(event, payload));
  }

  on<Event extends string>(event: Event, handler: EventHandlerFor<Event>): () => void {
    const wasEmpty = !this.listeners.has(event) || this.listeners.get(event)!.size === 0;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    if (wasEmpty) {
      this.activateBridge(event);
    }

    return () => this.off(event, handler);
  }

  once<Event extends string>(event: Event, handler: EventHandlerFor<Event>): void {
    let consumed = false;
    const wrapper = (payload: unknown) => {
      // Remove before user code so nested emits cannot rediscover this listener.
      // The guard also protects against a wrapper already captured in an
      // isolated-dispatch listener snapshot before a nested emission consumes it.
      if (consumed) return;
      consumed = true;
      this.off(event, wrapper as EventHandlerFor<Event>);
      handler(payload as EventPayload<Event>);
    };
    this.on(event, wrapper as EventHandlerFor<Event>);
  }

  off<Event extends string>(event: Event, handler: EventHandlerFor<Event>): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
    if (this.listeners.get(event)?.size === 0) {
      this.deactivateBridge(event);
    }
  }

  emit(event: string, payload?: unknown): void {
    if (!this.isolateListenerFailures) {
      this.listeners.get(event)?.forEach((handler) => handler(payload));
      return;
    }
    for (const handler of Array.from(this.listeners.get(event) ?? [])) {
      if (!this.shouldContinue()) break;
      try {
        handler(payload);
      } catch (error) {
        try { this.reportListenerError(error, event); } catch { /* observer failures cannot stop dispatch */ }
      }
    }
  }

  removeAll(): void {
    for (const event of Array.from(this.activeBridges)) {
      this.deactivateBridge(event);
    }
    this.listeners.clear();
  }

  private activateBridge(event: string): void {
    const bridge = this.bridgeActivations.get(event);
    if (!bridge || this.activeBridges.has(event)) return;
    this.activeBridges.add(event);
    bridge.activate((payload) => this.emit(event, payload));
  }

  private deactivateBridge(event: string): void {
    if (!this.activeBridges.has(event)) return;
    this.bridgeActivations.get(event)?.deactivate();
    this.activeBridges.delete(event);
  }
}
