import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileSystemService } from "../../services/FileSystemService.js";
import { promises as fs } from "fs";
import path from "path";

vi.mock("fs", () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe("FileSystemService", () => {
  let fileSystem: FileSystemService;

  beforeEach(() => {
    fileSystem = new FileSystemService();
    vi.clearAllMocks();
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const result = await fileSystem.fileExists("test.txt");
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith("test.txt");
    });

    it("should return false if file does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));
      const result = await fileSystem.fileExists("test.txt");
      expect(result).toBe(false);
    });
  });

  describe("writeFile", () => {
    it("should create directory and write file", async () => {
      const filePath = "dir/test.txt";
      const content = "hello";
      
      await fileSystem.writeFile(filePath, content);
      
      expect(fs.mkdir).toHaveBeenCalledWith("dir", { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, "utf-8");
    });
  });

  describe("readFile", () => {
    it("should read file content", async () => {
      const filePath = "test.txt";
      const content = "hello world";
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const result = await fileSystem.readFile(filePath);
      
      expect(result).toBe(content);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf-8");
    });
  });

  describe("ensureDir", () => {
    it("should create directory recursively", async () => {
      const dirPath = "some/nested/dir";
      await fileSystem.ensureDir(dirPath);
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });
  });
});
