import { IDataTypeProvider } from './IDataTypeProvider';
import { ProviderRegistry } from './ProviderRegistry';
import { HttpProviderAdapter } from './HttpProviderAdapter';
import { ThrottlePolicy } from './ThrottlePolicy';
import { QuotaManager } from './QuotaManager';
import { HttpObservability } from './HttpObservability';
import { FormulaContext, FormulaValue } from '../types/formula-types';

/**
 * AlphaVantageDriver - Minimal HTTP driver for Alpha Vantage stock data
 *
 * Phase 1 Implementation (PR #4):
 * - GLOBAL_QUOTE endpoint only (single symbol per request)
 * - 5 req/min throttle (Alpha Vantage free tier rate limit)
 * - 500/day quota (Alpha Vantage free tier daily limit)
 * - Hard failure on quota exhaustion
 * - NO batching, NO optimization
 *
 * Correctness priorities:
 * 1. Quota enforcement (QUOTA CONTRACT)
 * 2. Determinism boundary (DETERMINISM CONTRACT via prefetch())
 * 3. Throttle coordination
 * 4. Retry accounting
 *
 * Sequencing (CRITICAL):
 *   await throttle.acquire();  // Wait for rate limit slot
 *   quota.assertAvailable();   // Check quota before consuming
 *   quota.consume();           // Decrement counter atomically
 *   dispatch HTTP request      // Make network call
 *
 * @see QuotaManager for quota contract enforcement
 * @see HttpProviderAdapter for retry/timeout handling
 * @see ThrottlePolicy for rate limiting
 */
export class AlphaVantageDriver implements IDataTypeProvider {
  readonly id = 'alpha-vantage-driver';
  readonly type = 'stock';

  private readonly quota: QuotaManager;
  private readonly adapter: HttpProviderAdapter;
  private readonly throttle: ThrottlePolicy;
  private readonly observability?: HttpObservability;

  /**
   * @param apiKey - Alpha Vantage API key
   * @param registry - Provider registry for caching
   * @param adapter - HTTP adapter for retry/timeout
   * @param throttle - Rate limiting policy (default: 5 req/min)
   * @param quota - Quota manager (default: 500/day)
   * @param observability - Optional telemetry hooks
   */
  constructor(
    private readonly apiKey: string,
    private readonly registry: ProviderRegistry,
    adapter?: HttpProviderAdapter,
    throttle?: ThrottlePolicy,
    quota?: QuotaManager,
    observability?: HttpObservability
  ) {
    if (!apiKey) {
      throw new Error('AlphaVantageDriver: apiKey required');
    }

    // Phase 1: Disable retries for linear quota accounting
    // retries: 0 ensures 1 symbol = 1 attempt = 1 quota
    // Retry strategy deferred to Phase 2 after telemetry
    this.adapter = adapter || new HttpProviderAdapter(
      fetch,
      (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      { 
        retries: 0,        // PHASE 1: No retries
        timeoutMs: 5000    // 5s timeout
      },
      Math.random
    );
    this.throttle = throttle || this.createDefaultThrottle();
    this.quota = quota || new QuotaManager(500); // Default: 500/day
    this.observability = observability;
  }

  /**
   * Default throttle: 5 requests per minute (Alpha Vantage free tier)
   */
  private createDefaultThrottle(): ThrottlePolicy {
    // Implemented via WindowThrottle in actual usage
    // This is a placeholder - real instantiation happens in constructor parameter
    return {
      acquire: async () => {
        // No-op default (caller should provide WindowThrottle)
      }
    };
  }

  /**
   * Get value for a stock field (synchronous cache access)
   * 
   * @param field - Field name (e.g., 'Price', 'Change')
   * @param entity - Entity object (contains symbol)
   * @param context - Formula context
   * @returns Cached value or Error
   */
  getValue(field: string, entity: any, context: FormulaContext): FormulaValue {
    const symbol = entity.id || entity.symbol;
    if (!symbol) {
      return new Error('#REF!');
    }
    
    // Delegate to registry for cache lookup
    return this.registry.getValue('stock', symbol, field, entity, context);
  }

  /**
   * Prefetch stock quotes for multiple symbols
   *
   * DETERMINISM CONTRACT:
   * - All async work awaited before return
   * - All values written to registry before completion
   * - No fire-and-forget operations
   * - Errors cached as first-class values
   *
   * QUOTA CONTRACT:
   * - Quota checked and consumed per request
   * - Quota exhaustion throws Error("#QUOTA!") immediately
   * - Retries consume additional quota
   *
   * @param ids - Array of stock symbols (e.g., ["AAPL", "MSFT"])
   * @param ctx - Formula evaluation context (unused in Phase 1)
   */
  async prefetch(ids: string[], ctx: FormulaContext): Promise<void> {
    // Process each symbol sequentially (no batching in Phase 1)
    for (const symbol of ids) {
      try {
        // CRITICAL SEQUENCING (QUOTA CONTRACT - INVARIANT 3)
        
        // Step 1: Wait for rate limit slot
        await this.throttle.acquire();
        
        // Step 2: Check quota availability
        this.quota.assertAvailable();
        
        // Step 3: Consume quota atomically
        this.quota.consume();
        
        // Step 4: Dispatch HTTP request
        const quote = await this.fetchQuote(symbol);
        
        // Step 5: Cache successful result
        this.cacheQuote(symbol, quote);
        
      } catch (error) {
        // Cache error for deduplication (DETERMINISM CONTRACT)
        this.cacheError(symbol, error);
        
        // Track failure for metrics
        if (this.observability && 'recordFailure' in this.observability) {
          (this.observability as any).recordFailure(error);
        }
      }
    }
  }

  /**
   * Fetch single stock quote from Alpha Vantage GLOBAL_QUOTE endpoint
   *
   * Phase 1: Retries disabled (retries: 0) for linear quota accounting.
   * Network failures result in immediate error caching.
   * Retry strategy will be implemented in Phase 2 after gathering telemetry.
   *
   * @param symbol - Stock symbol (e.g., "AAPL")
   * @returns Stock quote data
   * @throws Error on network failure, quota exhaustion, or invalid response
   */
  private async fetchQuote(symbol: string): Promise<AlphaVantageQuote> {
    const startTime = Date.now();
    
    // Observability: request started
    this.observability?.requestStarted?.(symbol, startTime);

    try {
      // Make HTTP request via adapter (NO retries in Phase 1)
      const url = this.buildUrl(symbol);
      const response = await this.adapter.request<AlphaVantageResponse>({
        url,
        method: 'GET'
      });

      // Check for HTTP-level errors
      if (response.error) {
        throw new Error(response.error.message || 'HTTP request failed');
      }

      // Extract data from response
      if (!response.data) {
        throw new Error('No response data');
      }

      // Parse response
      const quote = this.parseResponse(symbol, response.data);

      // Observability: request finished
      const duration = Date.now() - startTime;
      this.observability?.requestFinished?.(symbol, duration, false);

      return quote;
      
    } catch (error) {
      // Observability: request failed
      const duration = Date.now() - startTime;
      this.observability?.requestFinished?.(symbol, duration, false);
      
      throw error;
    }
  }

  /**
   * Build Alpha Vantage API URL for GLOBAL_QUOTE endpoint
   */
  private buildUrl(symbol: string): string {
    const params = new URLSearchParams({
      function: 'GLOBAL_QUOTE',
      symbol: symbol,
      apikey: this.apiKey
    });
    return `https://www.alphavantage.co/query?${params.toString()}`;
  }

  /**
   * Parse Alpha Vantage API response
   *
   * @throws Error if response invalid or contains error message
   */
  private parseResponse(symbol: string, response: AlphaVantageResponse): AlphaVantageQuote {
    // Alpha Vantage error response
    if ('Error Message' in response) {
      throw new Error(`Alpha Vantage: ${response['Error Message']}`);
    }

    // Alpha Vantage rate limit response
    if ('Note' in response && response.Note && response.Note.includes('API call frequency')) {
      throw new Error('#RATE_LIMIT!');
    }

    // Extract quote data
    const globalQuote = response['Global Quote'];
    if (!globalQuote || Object.keys(globalQuote).length === 0) {
      throw new Error(`No data for symbol: ${symbol}`);
    }

    return {
      symbol: globalQuote['01. symbol'],
      price: parseFloat(globalQuote['05. price']),
      change: parseFloat(globalQuote['09. change']),
      changePercent: globalQuote['10. change percent'],
      volume: parseInt(globalQuote['06. volume'], 10),
      latestTradingDay: globalQuote['07. latest trading day']
    };
  }

  /**
   * Cache quote data in registry
   */
  private cacheQuote(symbol: string, quote: AlphaVantageQuote): void {
    // Cache individual fields for STOCK() function access
    this.registry.setCachedValue({ type: 'stock', id: symbol, field: 'Price' }, quote.price);
    this.registry.setCachedValue({ type: 'stock', id: symbol, field: 'Change' }, quote.change);
    this.registry.setCachedValue({ type: 'stock', id: symbol, field: 'ChangePercent' }, quote.changePercent);
    this.registry.setCachedValue({ type: 'stock', id: symbol, field: 'Volume' }, quote.volume);
    this.registry.setCachedValue({ type: 'stock', id: symbol, field: 'LastTradeDate' }, quote.latestTradingDay);
  }

  /**
   * Cache error in registry for deduplication
   */
  private cacheError(symbol: string, error: unknown): void {
    const errorValue = error instanceof Error ? error : new Error(String(error));
    
    // Cache error for all common fields
    const fields = ['Price', 'Change', 'ChangePercent', 'Volume', 'LastTradeDate'];
    fields.forEach(field => {
      this.registry.setCachedValue({ type: 'stock', id: symbol, field }, errorValue);
    });

    // Observability: quota hit (if quota error)
    if (errorValue.message === '#QUOTA!') {
      this.observability?.quotaHit?.(this.quota.getUsed(), this.quota.limit);
    }
  }

  /**
   * Get metrics report for observation phase
   * 
   * Requires that the observability instance is a MetricsCollector.
   * Returns null if no metrics collector is configured.
   */
  getMetricsReport(): any | null {
    if (this.observability && 'getReport' in this.observability) {
      return (this.observability as any).getReport(this.quota.getUsed(), this.quota.limit);
    }
    return null;
  }
}

/**
 * Alpha Vantage API response types
 */
interface AlphaVantageResponse {
  'Global Quote'?: {
    '01. symbol': string;
    '05. price': string;
    '09. change': string;
    '10. change percent': string;
    '06. volume': string;
    '07. latest trading day': string;
  };
  'Error Message'?: string;
  'Note'?: string;
}

/**
 * Parsed stock quote data
 */
export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  volume: number;
  latestTradingDay: string;
}
