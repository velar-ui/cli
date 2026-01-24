import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddService } from "../../services/AddService.js";
import { ComponentService } from "../../services/ComponentService.js";
import { IRegistryService, IConfigManager } from "../../types/interfaces.js";
import { RegistryData, AddResult } from "../../types/index.js";
import { logger } from "../../utils/logger.js";

vi.mock("../../utils/logger.js", () => ({
  logger: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    step: vi.fn(),
  },
}));

describe("AddService", () => {
  let addService: AddService;
  let mockRegistryService: vi.Mocked<IRegistryService>;
  let mockConfigManager: vi.Mocked<IConfigManager>;
  let mockComponentService: vi.Mocked<ComponentService>;

  beforeEach(() => {
    mockRegistryService = {
      fetchRegistry: vi.fn(),
      fetchComponent: vi.fn(),
      fetchFile: vi.fn(),
      resolveDependencies: vi.fn(),
    } as any;

    mockConfigManager = {
      validate: vi.fn(),
      load: vi.fn(),
      getPackageManager: vi.fn(),
      getComponentsPath: vi.fn(),
      getThemePath: vi.fn(),
      getTheme: vi.fn(),
      getJsEntryPath: vi.fn(),
    } as any;

    mockComponentService = {
      addComponents: vi.fn(),
    } as any;

    addService = new AddService(
      mockRegistryService,
      mockConfigManager,
      mockComponentService,
    );
    
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("validateInitialization", () => {
    it("should not throw if config is valid", () => {
      mockConfigManager.validate.mockReturnValue(true);
      expect(() => addService.validateInitialization()).not.toThrow();
    });

    it("should throw if config is invalid", () => {
      mockConfigManager.validate.mockReturnValue(false);
      expect(() => addService.validateInitialization()).toThrow("Velar is not initialized");
    });
  });

  describe("validateComponents", () => {
    const registry: RegistryData = {
      components: [
        { name: "button", files: [], path: "components/button" },
        { name: "card", files: [], path: "components/card" },
      ],
    };

    it("should not throw if all components exist", () => {
      expect(() => addService.validateComponents(["button", "card"], registry)).not.toThrow();
    });

    it("should throw if a component is missing", () => {
      expect(() => addService.validateComponents(["button", "missing"], registry)).toThrow('Component "missing" not found');
    });
  });

  describe("getAvailableComponents", () => {
    it("should fetch registry from registry service", async () => {
      const mockData = { components: [] };
      mockRegistryService.fetchRegistry.mockResolvedValue(mockData);
      
      const result = await addService.getAvailableComponents();
      
      expect(result).toBe(mockData);
      expect(mockRegistryService.fetchRegistry).toHaveBeenCalled();
    });
  });

  describe("addComponents", () => {
    it("should call component service", async () => {
      const componentNames = ["button"];
      const mockResult: AddResult = { added: ["button/button.blade.php"], skipped: [], failed: [] };
      mockComponentService.addComponents.mockResolvedValue(mockResult);
      
      const result = await addService.addComponents(componentNames);
      
      expect(result).toBe(mockResult);
      expect(mockComponentService.addComponents).toHaveBeenCalledWith(componentNames);
    });
  });

  describe("displayResults", () => {
    it("should log success for added files", () => {
      const result: AddResult = { added: ["file1"], skipped: [], failed: [] };
      addService.displayResults(result);
      expect(logger.success).toHaveBeenCalledWith("Added file1");
    });

    it("should log warning for skipped files", () => {
      const result: AddResult = { added: [], skipped: ["file1"], failed: [] };
      addService.displayResults(result);
      expect(logger.warning).toHaveBeenCalledWith("Skipped file1");
    });

    it("should log error for failed components", () => {
      const result: AddResult = { added: [], skipped: [], failed: [{ name: "comp", error: "err" }] };
      addService.displayResults(result);
      expect(logger.error).toHaveBeenCalledWith("Failed to add comp: err");
    });
  });

  describe("displayNextSteps", () => {
    it("should do nothing if no files added", () => {
      const result: AddResult = { added: [], skipped: [], failed: [] };
      addService.displayNextSteps(result);
      // No log expected
    });

    it("should display next steps for blade components", () => {
      const spy = vi.spyOn(console, "log");
      const result: AddResult = { added: ["button/button.blade.php"], skipped: [], failed: [] };
      addService.displayNextSteps(result);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Use <x-ui.COMPONENT>"));
    });

    it("should display JS import reminder if JS entry is missing", () => {
      const spy = vi.spyOn(console, "log");
      mockConfigManager.validate.mockReturnValue(true);
      mockConfigManager.getJsEntryPath.mockReturnValue("");
      
      const result: AddResult = { added: ["datepicker/datepicker.js"], skipped: [], failed: [] };
      addService.displayNextSteps(result);
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Import JS files in your app.js"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("import './ui/datepicker.js'"));
    });
  });
});
