import { NetworkError } from "../errors/errors";
import type { FetchOptions } from "../types/index";

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<FetchOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  timeout: 30000,
  headers: {},
};

/**
 * Sleep utility for retry delays
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt with exponential backoff
 * @param attempt - Current attempt number (0-indexed)
 * @param initialDelay - Initial delay in milliseconds
 * @param backoffFactor - Factor to multiply delay by each attempt
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffFactor: number,
  maxDelay: number,
): number {
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Check if a status code is retryable
 * @param status - HTTP status code
 * @param retryableStatusCodes - List of retryable status codes
 * @returns True if status code is retryable
 */
function isRetryableStatus(
  status: number,
  retryableStatusCodes: readonly number[],
): boolean {
  return retryableStatusCodes.includes(status);
}

/**
 * Create a fetch request with timeout
 * @param url - URL to fetch
 * @param options - Fetch options including timeout
 * @returns Promise resolving to Response
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions,
): Promise<Response> {
  const { timeout = DEFAULT_RETRY_OPTIONS.timeout, headers = {} } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Velar-CLI",
        ...headers,
      },
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkError(
        `Request timeout after ${timeout}ms for ${url}`,
        error,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * HTTP service with retry logic and timeout support
 */
export class HttpService {
  /**
   * Fetch a URL with retry logic and timeout
   * @param url - URL to fetch
   * @param options - Fetch options including retry configuration
   * @returns Promise resolving to Response
   * @throws NetworkError if all retries fail
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const retryOptions = {
      maxRetries: options.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
      initialDelay: options.initialDelay ?? DEFAULT_RETRY_OPTIONS.initialDelay,
      backoffFactor:
        options.backoffFactor ?? DEFAULT_RETRY_OPTIONS.backoffFactor,
      maxDelay: options.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay,
      retryableStatusCodes:
        options.retryableStatusCodes ??
        DEFAULT_RETRY_OPTIONS.retryableStatusCodes,
      timeout: options.timeout ?? DEFAULT_RETRY_OPTIONS.timeout,
      headers: options.headers ?? DEFAULT_RETRY_OPTIONS.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, {
          ...options,
          timeout: retryOptions.timeout,
          headers: retryOptions.headers,
        });

        // If response is successful or not retryable, return it
        if (
          response.ok ||
          !isRetryableStatus(response.status, retryOptions.retryableStatusCodes)
        ) {
          return response;
        }
        console.log("Attempt: ", attempt);
        // If this is the last attempt, throw error
        if (attempt === retryOptions.maxRetries) {
          throw new NetworkError(
            `Request failed after ${retryOptions.maxRetries + 1} attempts: ${response.status} ${response.statusText}`,
          );
        }

        // Calculate delay and wait before retry
        const delay = calculateDelay(
          attempt,
          retryOptions.initialDelay,
          retryOptions.backoffFactor,
          retryOptions.maxDelay,
        );
        await sleep(delay);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof NetworkError &&
          error.message.includes("timeout")
        ) {
          if (attempt === retryOptions.maxRetries) {
            throw error;
          }
          const delay = calculateDelay(
            attempt,
            retryOptions.initialDelay,
            retryOptions.backoffFactor,
            retryOptions.maxDelay,
          );
          await sleep(delay);
          continue;
        }

        // If this is the last attempt, throw error
        if (attempt === retryOptions.maxRetries) {
          if (lastError instanceof NetworkError) {
            throw lastError;
          }
          throw new NetworkError(
            `Request failed after ${retryOptions.maxRetries + 1} attempts: ${lastError.message}`,
            lastError,
          );
        }

        // Calculate delay and wait before retry
        const delay = calculateDelay(
          attempt,
          retryOptions.initialDelay,
          retryOptions.backoffFactor,
          retryOptions.maxDelay,
        );
        await sleep(delay);
      }
    }

    throw new NetworkError(
      `Request failed after ${retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
      lastError ?? undefined,
    );
  }

  /**
   * Fetch JSON from a URL with retry logic
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Promise resolving to parsed JSON
   * @throws NetworkError if fetch or parsing fails
   */
  async fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
    const response = await this.fetch(url, options);

    if (!response.ok) {
      throw new NetworkError(
        `Failed to fetch JSON from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new NetworkError(
        `Failed to parse JSON from ${url}: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Fetch text from a URL with retry logic
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Promise resolving to text content
   * @throws NetworkError if fetch fails
   */
  async fetchText(url: string, options?: FetchOptions): Promise<string> {
    const response = await this.fetch(url, options);

    if (!response.ok) {
      throw new NetworkError(
        `Failed to fetch text from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    try {
      return await response.text();
    } catch (error) {
      throw new NetworkError(
        `Failed to read text from ${url}: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}
