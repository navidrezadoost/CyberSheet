/**
 * External data type provider system.
 *
 * Week 3 Phase 2 (v2.3-provider-layer)
 * PR #3 - Batch resolution layer (Feb 25, 2026)
 * PR #4 - HTTP driver layer (Feb 25, 2026)
 */

// Type-only re-export: `IDataTypeProvider` is a TypeScript interface and is
// erased at compile time. A value-style `export { ... }` requests a runtime
// binding that does not exist in the emitted JS, which throws
// "does not provide an export named 'IDataTypeProvider'" during module load.
export type { IDataTypeProvider } from "./IDataTypeProvider";
export { ProviderRegistry } from "./ProviderRegistry";
export { StockProvider } from "./StockProvider";
export { GeographyProvider } from "./GeographyProvider";
export { HttpProviderAdapter } from "./HttpProviderAdapter";

// Async provider resolution primitives (PR #1)
// Values (classes) vs. types (type alias / interface) are split so type-only
// symbols are never re-exported as runtime values.
export {
  ProviderResolutionContext,
  MockBatchResolver,
} from "./ProviderResolution";
export type { ProviderRef, ProviderError } from "./ProviderResolution";

// Batch resolution layer (PR #3)
export { BatchResolver } from "./BatchResolver";
export type { BatchResolverOptions } from "./BatchResolver";
export { WindowThrottle } from "./ThrottlePolicy";
export type { ThrottlePolicy } from "./ThrottlePolicy";

// HTTP driver layer (PR #4)
export { QuotaManager } from "./QuotaManager";
export type { HttpObservability } from "./HttpObservability";
export { AlphaVantageDriver } from "./AlphaVantageDriver";
export type { AlphaVantageQuote } from "./AlphaVantageDriver";
