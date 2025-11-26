export type Disposable = { dispose(): void };

export class Emitter<T> {
  private listeners: Set<(e: T) => void> = new Set();

  on(listener: (e: T) => void): Disposable {
    this.listeners.add(listener);
    return { dispose: () => this.off(listener) };
  }

  off(listener: (e: T) => void): void {
    this.listeners.delete(listener);
  }

  emit(event: T): void {
    for (const l of Array.from(this.listeners)) l(event);
  }
}
