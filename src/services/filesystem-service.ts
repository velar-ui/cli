import { promises as fs } from "fs";
import path from "path";
import type { IFileSystemService } from "../types/interfaces";

/**
 * Service for file system operations
 */
export class FilesystemService implements IFileSystemService {
  /**
   * Check if a file exists
   * @param filePath - Path to check
   * @returns Promise resolving to true if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write content to a file, creating directories if necessary
   * @param filePath - Path to write to
   * @param content - Content to write
   * @returns Promise that resolves when file is written
   * @throws Error if write fails
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  /**
   * Read content from a file
   * @param filePath - Path to read from
   * @returns Promise resolving to file content
   * @throws Error if file doesn't exist or read fails
   */
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf-8");
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath - Directory path
   * @returns Promise that resolves when directory is ensured
   * @throws Error if directory creation fails
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
