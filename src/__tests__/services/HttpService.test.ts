import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpService } from "../../services/HttpService.js";
import { NetworkError } from "../../errors/errors.js";

describe("HttpService", () => {
  let httpService: HttpService;

  beforeEach(() => {
    httpService = new HttpService();
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("fetch", () => {
    it("should fetch successfully on the first attempt", async () => {
      const mockResponse = new Response("ok", { status: 200 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const response = await httpService.fetch("http://example.com");

      expect(response).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable status codes and eventually succeed", async () => {
      const errorResponse = new Response("error", { status: 500 });
      const successResponse = new Response("ok", { status: 200 });

      vi.mocked(fetch)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const fetchPromise = httpService.fetch("http://example.com", {
        initialDelay: 10,
      });

      // Wait for first attempt
      await vi.advanceTimersByTimeAsync(0);
      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(10);

      const response = await fetchPromise;

      expect(response).toBe(successResponse);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw NetworkError after maximum retries", async () => {
      const errorResponse = new Response("error", { status: 500 });
      vi.mocked(fetch).mockResolvedValue(errorResponse);

      const fetchPromise = httpService.fetch("http://example.com", {
        maxRetries: 2,
        initialDelay: 10,
      });

      await vi.advanceTimersByTimeAsync(0); // 1st
      await vi.advanceTimersByTimeAsync(10); // 2nd
      await vi.advanceTimersByTimeAsync(20); // 3rd

      await expect(fetchPromise).rejects.toThrow(NetworkError);
    });

    it("should handle timeout", async () => {
      vi.mocked(fetch).mockImplementation(async (url, options) => {
        return new Promise((resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              const error = new Error("AbortError");
              error.name = "AbortError";
              reject(error);
            });
          }
        });
      });

      const fetchPromise = httpService.fetch("http://example.com", {
        timeout: 100,
        maxRetries: 0,
      });

      await vi.advanceTimersByTimeAsync(100);

      await expect(fetchPromise).rejects.toThrow(NetworkError);
    });
  });

  describe("fetchJson", () => {
    it("should fetch and parse JSON successfully", async () => {
      const data = { foo: "bar" };
      const mockResponse = new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const result = await httpService.fetchJson("http://example.com");

      expect(result).toEqual(data);
    });

    it("should throw NetworkError if response is not ok", async () => {
      const mockResponse = new Response("Not Found", { status: 404 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      await expect(httpService.fetchJson("http://example.com")).rejects.toThrow(
        NetworkError,
      );
    });

    it("should throw NetworkError if JSON parsing fails", async () => {
      const mockResponse = new Response("invalid json", { status: 200 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      await expect(httpService.fetchJson("http://example.com")).rejects.toThrow(NetworkError);
    });
  });

  describe("fetchText", () => {
    it("should fetch text successfully", async () => {
      const text = "hello world";
      const mockResponse = new Response(text, { status: 200 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const result = await httpService.fetchText("http://example.com");

      expect(result).toBe(text);
    });

    it("should throw NetworkError if response is not ok", async () => {
      const mockResponse = new Response("Error", { status: 500 });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const fetchPromise = httpService.fetchText("http://example.com", {
        maxRetries: 0,
      });

      await vi.advanceTimersByTimeAsync(0);

      await expect(fetchPromise).rejects.toThrow(NetworkError);
    });
  });
});
