export type EventHandler = (payload: unknown) => void;
export type BridgeEmit = (payload: unknown) => void;

export interface EventAPI {
  on(event: string, handler: EventHandler): () => void;
  once(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
}

type BridgeActivation = {
  activate: (emit: BridgeEmit) => void;
  deactivate: () => void;
};

export class EventBus implements EventAPI {
  private listeners = new Map<string, Set<EventHandler>>();
  private bridgeActivations = new Map<string, BridgeActivation>();
  private activeBridges = new Set<string>();

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

  on(event: string, handler: EventHandler): () => void {
    const wasEmpty = !this.listeners.has(event) || this.listeners.get(event)!.size === 0;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    if (wasEmpty) {
      this.activateBridge(event);
    }

    return () => this.off(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    const wrapper = (payload: unknown) => {
      handler(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
    if (this.listeners.get(event)?.size === 0) {
      this.deactivateBridge(event);
    }
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
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
