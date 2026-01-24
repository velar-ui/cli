import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComponentService } from "../../services/ComponentService.js";
import { IRegistryService, IFileSystemService, IConfigManager } from "../../types/interfaces.js";
import { VelarComponentMeta, AddResult } from "../../types/index.js";
import * as p from "@clack/prompts";
import path from "path";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
}));

describe("ComponentService", () => {
  let componentService: ComponentService;
  let mockRegistryService: vi.Mocked<IRegistryService>;
  let mockFileSystem: vi.Mocked<IFileSystemService>;
  let mockConfigManager: vi.Mocked<IConfigManager>;

  const mockComponent: VelarComponentMeta = {
    name: "button",
    description: "A button component",
    files: [
      { type: "blade", path: "button.blade.php" },
      { type: "js", path: "button.js" },
    ],
    path: "components/button",
  };

  beforeEach(() => {
    mockRegistryService = {
      fetchComponent: vi.fn(),
      fetchFile: vi.fn(),
      resolveDependencies: vi.fn(),
      fetchRegistry: vi.fn(),
    } as any;

    mockFileSystem = {
      fileExists: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      ensureDir: vi.fn(),
    } as any;

    mockConfigManager = {
      getComponentsPath: vi.fn().mockReturnValue("resources/views/components/velar"),
      validate: vi.fn(),
      load: vi.fn(),
      getPackageManager: vi.fn(),
      getThemePath: vi.fn(),
      getJsEntryPath: vi.fn().mockReturnValue("resources/js/app.js"),
      getTheme: vi.fn(),
    } as any;

    componentService = new ComponentService(
      mockRegistryService,
      mockFileSystem,
      mockConfigManager,
    );

    vi.clearAllMocks();
  });

  describe("addComponents", () => {
    it("should add multiple components successfully", async () => {
      mockRegistryService.fetchComponent.mockResolvedValue(mockComponent);
      mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
      mockRegistryService.fetchFile.mockResolvedValue("file content");
      mockFileSystem.fileExists.mockResolvedValue(false);

      const result = await componentService.addComponents(["button"]);

      expect(result.added).toContain("button/button.blade.php");
      expect(result.added).toContain("button/button.js");
      expect(mockFileSystem.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        path.join("resources/js/ui", "button.js"),
        "file content",
      );
    });

    it("should handle failures for specific components", async () => {
      mockRegistryService.fetchComponent.mockRejectedValue(new Error("Fetch failed"));

      const result = await componentService.addComponents(["button"]);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.name).toBe("button");
      expect(result.failed[0]?.error).toBe("Fetch failed");
    });

    it("should handle error during addComponent but continue others", async () => {
       mockRegistryService.fetchComponent
         .mockResolvedValueOnce(mockComponent)
         .mockRejectedValueOnce(new Error("Second failed"));
       mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
       mockRegistryService.fetchFile.mockResolvedValue("content");
       mockFileSystem.fileExists.mockResolvedValue(false);

       const result = await componentService.addComponents(["button", "failed"]);
       expect(result.added).toHaveLength(2); // button.blade.php and button.js
       expect(result.failed).toHaveLength(1);
       expect(result.failed[0]?.name).toBe("failed");
    });
  });

  describe("destinations", () => {
    it("should return correct destination for CSS", async () => {
      const compWithCss = { ...mockComponent, files: [{ type: "css", path: "button.css" }] };
      mockRegistryService.fetchComponent.mockResolvedValue(compWithCss);
      mockRegistryService.resolveDependencies.mockResolvedValue([compWithCss]);
      mockRegistryService.fetchFile.mockResolvedValue("css content");
      mockFileSystem.fileExists.mockResolvedValue(false);

      await componentService.addComponents(["button"]);

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        path.join("resources/css/components", "button.css"),
        "css content"
      );
    });

    it("should return default destination for unknown type", async () => {
       const compWithOther = { ...mockComponent, files: [{ type: "other", path: "other.txt" }] };
       mockRegistryService.fetchComponent.mockResolvedValue(compWithOther);
       mockRegistryService.resolveDependencies.mockResolvedValue([compWithOther]);
       mockRegistryService.fetchFile.mockResolvedValue("other content");
       mockFileSystem.fileExists.mockResolvedValue(false);

       await componentService.addComponents(["button"]);

       expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
         path.join("resources/views/components/velar", "other.txt"),
         "other content"
       );
    });
  });

  describe("file conflicts", () => {
    it("should overwrite file if user chooses to", async () => {
      mockRegistryService.fetchComponent.mockResolvedValue(mockComponent);
      mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
      mockRegistryService.fetchFile.mockResolvedValue("new content");
      mockFileSystem.fileExists.mockResolvedValue(true);
      vi.mocked(p.select).mockResolvedValue("overwrite");

      const result = await componentService.addComponents(["button"]);

      expect(result.added).toContain("button/button.blade.php");
      expect(mockFileSystem.writeFile).toHaveBeenCalled();
    });

    it("should skip file if user chooses to", async () => {
      mockRegistryService.fetchComponent.mockResolvedValue(mockComponent);
      mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
      mockRegistryService.fetchFile.mockResolvedValue("content");
      mockFileSystem.fileExists.mockResolvedValue(true);
      vi.mocked(p.select).mockResolvedValue("skip");

      const result = await componentService.addComponents(["button"]);

      expect(result.skipped).toContain("button/button.blade.php");
      expect(mockFileSystem.writeFile).not.toHaveBeenCalled();
    });

    it("should cancel if user chooses to", async () => {
       const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
       mockRegistryService.fetchComponent.mockResolvedValue(mockComponent);
       mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
       mockRegistryService.fetchFile.mockResolvedValue("content");
       mockFileSystem.fileExists.mockResolvedValue(true);
       vi.mocked(p.select).mockResolvedValue("cancel");

       await expect(componentService.addComponents(["button"])).rejects.toThrow("exit");
    });
  });

  describe("autoImportJs", () => {
     it("should handle error during auto-import but not fail the whole process", async () => {
        mockRegistryService.fetchComponent.mockResolvedValue(mockComponent);
        mockRegistryService.resolveDependencies.mockResolvedValue([mockComponent]);
        mockRegistryService.fetchFile.mockResolvedValue("js content");
        mockFileSystem.fileExists.mockResolvedValue(false);
        mockFileSystem.fileExists.mockImplementation(async (path) => {
           if (path === "resources/js/app.js") return true;
           return false;
        });

        const jsUtils = await import("../../utils/js.js");
        vi.spyOn(jsUtils, "injectComponentJs").mockImplementation(() => {
           throw new Error("Injection failed");
        });

        const result = await componentService.addComponents(["button"]);
        expect(result.added).toContain("button/button.js");
        // Should have logged warning but result is still success
     });
  });
});
