import { HttpProviderAdapter, HttpProviderOptions, HttpRequestConfig, HttpResponse } from '../src/providers/HttpProviderAdapter';
import { ProviderErrorKind } from '../src/providers/ProviderResolution';

describe('HttpProviderAdapter', () => {
  let sleeps: number[];
  let adapter: HttpProviderAdapter;
  let fakeFetch: jest.Mock;



  beforeEach(() => {
    sleeps = [];
    const sleepFn = (ms: number) => {
      sleeps.push(ms);
      return Promise.resolve();
    };

    fakeFetch = jest.fn();
    const opts: HttpProviderOptions = {
      timeoutMs: 50,
      retries: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
    };

    adapter = new HttpProviderAdapter(fakeFetch as any, sleepFn, opts);
  });

  it('should succeed on first try', async () => {
    const body = { foo: 'bar' };
    fakeFetch.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.data).toEqual(body);
    expect(res.error).toBeUndefined();
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(sleeps.length).toBe(0);
  });

  it('should retry on server error and eventually succeed', async () => {
    const body = { value: 42 };
    fakeFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });

    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.data).toEqual(body);
    expect(res.error).toBeUndefined();
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    expect(sleeps.length).toBe(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(10);
  });

  it('should stop retrying after retries exhausted', async () => {
    fakeFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.error).toBeDefined();
    expect(res.error?.kind).toBe('SERVER');
    expect(fakeFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(sleeps.length).toBe(2);
  });

  it('should map network failures to NETWORK error', async () => {
    fakeFetch.mockRejectedValue({ code: 'ENOTFOUND' });
    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.error?.kind).toBe('NETWORK');
    expect(res.error?.retryable).toBe(true);
    expect(fakeFetch).toHaveBeenCalledTimes(3);
  });

  it('should classify AbortError as TIMEOUT', async () => {
    fakeFetch.mockRejectedValue({ name: 'AbortError' });
    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.error?.kind).toBe('TIMEOUT');
  });

  it('should propagate Retry-After header on 429', async () => {
    fakeFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h.toLowerCase() === 'retry-after' ? '2' : null) },
      json: async () => ({})
    });

    const res = await adapter.request({ url: 'http://example.com' });
    expect(res.error?.kind).toBe('RATE_LIMIT');
    expect(res.error?.retryAfter).toBe('2');
  });
});
