/** Runtime environment access that remains type-safe in browser builds. */
type ProcessEnvironment = {
  env?: { NODE_ENV?: string };
};

export function isProductionEnvironment(): boolean {
  const runtime = globalThis as typeof globalThis & { process?: ProcessEnvironment };
  return runtime.process?.env?.NODE_ENV === 'production';
}

export interface NodeProcessLike {
  version: string;
  env: { NODE_ENV?: string };
  memoryUsage(): { heapUsed: number; rss: number };
  stdout: { write(message: string): void };
  exit(code?: number): never;
}

/** Used only by the explicitly Node-only storage benchmark entry point. */
export function getNodeProcess(): NodeProcessLike {
  const runtime = globalThis as typeof globalThis & { process?: NodeProcessLike };
  if (!runtime.process) throw new Error('This benchmark requires Node.js.');
  return runtime.process;
}
