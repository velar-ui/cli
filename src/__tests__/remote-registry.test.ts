import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchGitHubRegistry, fetchComponent, fetchComponentFile } from "../utils/remote-registry.js";
import { HttpService } from "../services/HttpService.js";
import { ComponentNotFoundError, NetworkError } from "../errors/errors.js";

vi.mock("../services/HttpService.js");

describe("remote-registry utils", () => {
  let mockHttpService: vi.Mocked<HttpService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpService = vi.mocked(new HttpService());
    // The instance used in remote-registry is internal, we mock the class methods
    vi.spyOn(HttpService.prototype, 'fetchJson').mockImplementation(mockHttpService.fetchJson);
    vi.spyOn(HttpService.prototype, 'fetchText').mockImplementation(mockHttpService.fetchText);
    vi.spyOn(HttpService.prototype, 'fetch').mockImplementation(mockHttpService.fetch);
  });

  describe("fetchGitHubRegistry", () => {
    it("should fetch registry.json directly if available", async () => {
      const mockData = { components: [{ name: "button" }] };
      mockHttpService.fetchJson.mockResolvedValueOnce(mockData);

      const result = await fetchGitHubRegistry();

      expect(result).toEqual(mockData);
      expect(mockHttpService.fetchJson).toHaveBeenCalledWith(expect.stringContaining("registry.json"));
    });

    it("should fallback to listing directory if registry.json fails", async () => {
      mockHttpService.fetchJson.mockRejectedValueOnce(new Error("404")); // registry.json fail
      mockHttpService.fetchJson.mockResolvedValueOnce([{ type: "dir", name: "button", path: "components/button" }]); // list dirs
      mockHttpService.fetchJson.mockResolvedValueOnce({ files: [] }); // fetch button meta.json

      const result = await fetchGitHubRegistry();

      expect(result.components).toHaveLength(1);
      expect(result.components[0]?.name).toBe("button");
    });
  });

  describe("fetchComponent", () => {
    it("should fetch component metadata", async () => {
      const mockFile = { name: "meta.json", download_url: "http://example.com" };
      mockHttpService.fetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      mockHttpService.fetchJson.mockResolvedValueOnce(mockFile);

      const result = await fetchComponent("button");

      expect(result).toEqual(mockFile);
    });

    it("should throw ComponentNotFoundError if status is 404", async () => {
      mockHttpService.fetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      await expect(fetchComponent("unknown")).rejects.toThrow(ComponentNotFoundError);
    });
  });

  describe("fetchComponentFile", () => {
    it("should fetch file content", async () => {
      const mockFile = { download_url: "http://example.com/file" };
      mockHttpService.fetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      mockHttpService.fetchJson.mockResolvedValueOnce(mockFile);
      mockHttpService.fetchText.mockResolvedValueOnce("file content");

      const result = await fetchComponentFile("button", "button.blade.php");

      expect(result).toBe("file content");
      expect(mockHttpService.fetchText).toHaveBeenCalledWith("http://example.com/file");
    });

    it("should throw NetworkError if download_url is missing", async () => {
      mockHttpService.fetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      mockHttpService.fetchJson.mockResolvedValueOnce({ download_url: null });

      await expect(fetchComponentFile("button", "file")).rejects.toThrow("File has no download URL");
    });
  });

  describe("fetchComponentMetaFromUrl", () => {
    it("should fetch and return meta directly if it's a valid JSON", async () => {
      const mockMeta = { name: "button", files: [] };
      mockHttpService.fetchText.mockResolvedValueOnce(JSON.stringify(mockMeta));

      const { fetchComponentMetaFromUrl } = await import("../utils/remote-registry.js");
      const result = await fetchComponentMetaFromUrl("http://example.com/meta.json");

      expect(result).toEqual(mockMeta);
    });

    it("should follow download_url if response is a GitHubFile", async () => {
      const mockGithubFile = { download_url: "http://raw.github/meta.json" };
      const mockMeta = { name: "button", files: [] };
      mockHttpService.fetchText.mockResolvedValueOnce(JSON.stringify(mockGithubFile));
      mockHttpService.fetchJson.mockResolvedValueOnce(mockMeta);

      const { fetchComponentMetaFromUrl } = await import("../utils/remote-registry.js");
      const result = await fetchComponentMetaFromUrl("http://api.github/meta.json");

      expect(result).toEqual(mockMeta);
      expect(mockHttpService.fetchJson).toHaveBeenCalledWith(mockGithubFile.download_url);
    });

    it("should throw NetworkError if parsing fails both ways", async () => {
      mockHttpService.fetchText.mockResolvedValueOnce("invalid");
      const { fetchComponentMetaFromUrl } = await import("../utils/remote-registry.js");

      await expect(fetchComponentMetaFromUrl("http://example.com")).rejects.toThrow(NetworkError);
    });
  });
});
