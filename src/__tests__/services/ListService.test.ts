import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../config/ConfigManager.js";
import { FileSystemService } from "../../services/FileSystemService.js";
import { ListService } from "../../services/ListService.js";
import { RegistryService } from "../../services/RegistryService.js";
import type { RegistryData, VelarComponentMeta } from "../../types/index.js";

describe("ListService", () => {
  let listService: ListService;
  let mockRegistryService: RegistryService;
  let mockConfigManager: ConfigManager;
  let mockFileSystem: FileSystemService;

  beforeEach(() => {
    mockRegistryService = {
      fetchRegistry: vi.fn(),
    } as unknown as RegistryService;

    mockConfigManager = {
      validate: vi.fn(),
      load: vi.fn(),
      getComponentsPath: vi.fn(),
    } as unknown as ConfigManager;

    mockFileSystem = {
      fileExists: vi.fn(),
    } as unknown as FileSystemService;

    listService = new ListService(
      mockRegistryService,
      mockConfigManager,
      mockFileSystem,
    );
  });

  it("should fetch registry from registry service", async () => {
    const mockRegistry: RegistryData = { components: [] };
    vi.mocked(mockRegistryService.fetchRegistry).mockResolvedValue(
      mockRegistry,
    );

    const result = await listService.fetchRegistry();

    expect(result).toBe(mockRegistry);
    expect(mockRegistryService.fetchRegistry).toHaveBeenCalled();
  });

  it("should sort components by name", () => {
    const components: VelarComponentMeta[] = [
      { name: "Button", path: "Button", files: [] },
      { name: "Alert", path: "Alert", files: [] },
    ];

    const sorted = listService.sortComponents(components);

    expect(sorted[0].name).toBe("Alert");
    expect(sorted[1].name).toBe("Button");
  });

  it("should check if component is installed", async () => {
    const component: VelarComponentMeta = {
      name: "Button",
      path: "Button",
      files: [],
    };

    vi.mocked(mockConfigManager.validate).mockReturnValue(true);
    vi.mocked(mockConfigManager.getComponentsPath).mockReturnValue(
      "resources/views/components/velar",
    );
    vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);

    const isInstalled = await listService.isComponentInstalled(component);

    expect(isInstalled).toBe(true);
    expect(mockFileSystem.fileExists).toHaveBeenCalledWith(
      expect.stringContaining("Button.blade.php"),
    );
  });

  it("should load config if not validated when checking installation", async () => {
    const component: VelarComponentMeta = {
      name: "Button",
      path: "Button",
      files: [],
    };

    vi.mocked(mockConfigManager.validate).mockReturnValue(false);
    vi.mocked(mockConfigManager.getComponentsPath).mockReturnValue("path");
    vi.mocked(mockFileSystem.fileExists).mockResolvedValue(false);

    await listService.isComponentInstalled(component);

    expect(mockConfigManager.load).toHaveBeenCalled();
  });
});
