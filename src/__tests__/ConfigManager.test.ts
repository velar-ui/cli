import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigManager } from "../config/ConfigManager.js";
import * as configUtils from "../utils/config.js";
import { logger } from "../utils/logger.js";
import type { VelarConfig } from "../types/index.js";

vi.mock("../utils/config.js", () => ({
  readVelarConfig: vi.fn(),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  const mockConfig: VelarConfig = {
    version: "0.1.0",
    theme: "neutral",
    packageManager: "pnpm",
    css: {
      entry: "resources/css/app.css",
      velar: "resources/css/velar.css",
    },
    components: {
      path: "resources/views/components/velar",
    },
  };

  beforeEach(() => {
    configManager = new ConfigManager();
    vi.clearAllMocks();
  });

  describe("load", () => {
    it("should load configuration successfully", async () => {
      vi.mocked(configUtils.readVelarConfig).mockReturnValue(mockConfig);
      
      const config = await configManager.load();
      
      expect(config).toEqual(mockConfig);
      expect(configUtils.readVelarConfig).toHaveBeenCalled();
      expect(configManager.validate()).toBe(true);
    });

    it("should throw error and log if config not found", async () => {
      vi.mocked(configUtils.readVelarConfig).mockImplementation(() => {
        throw new Error("File not found");
      });

      await expect(configManager.load()).rejects.toThrow("File not found");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getters", () => {
    beforeEach(async () => {
      vi.mocked(configUtils.readVelarConfig).mockReturnValue(mockConfig);
      await configManager.load();
    });

    it("should return package manager", () => {
      expect(configManager.getPackageManager()).toBe("pnpm");
    });

    it("should return components path", () => {
      expect(configManager.getComponentsPath()).toBe("resources/views/components/velar");
    });

    it("should return theme path", () => {
      expect(configManager.getThemePath()).toBe("resources/css/velar.css");
    });

    it("should return theme", () => {
      expect(configManager.getTheme()).toBe("neutral");
    });
  });

  describe("errors when not loaded", () => {
    it("should throw if getting package manager before load", () => {
      expect(() => configManager.getPackageManager()).toThrow("Configuration not loaded");
    });

    it("should throw if getting components path before load", () => {
      expect(() => configManager.getComponentsPath()).toThrow("Configuration not loaded");
    });

    it("should throw if getting theme path before load", () => {
      expect(() => configManager.getThemePath()).toThrow("Configuration not loaded");
    });

    it("should throw if getting JS entry path before load", () => {
      expect(() => configManager.getJsEntryPath()).toThrow("Configuration not loaded");
    });

    it("should throw if getting theme before load", () => {
      expect(() => configManager.getTheme()).toThrow("Configuration not loaded");
    });
  });

  it("should throw if config is missing after load", async () => {
    vi.mocked(configUtils.readVelarConfig).mockReturnValue(undefined as any);
    await expect(configManager.load()).rejects.toThrow("Configuration not found");
  });

  it("should return empty JS entry if not present in config", async () => {
    const configNoJs = { ...mockConfig };
    delete (configNoJs as any).js;
    vi.mocked(configUtils.readVelarConfig).mockReturnValue(configNoJs);
    await configManager.load();
    expect(configManager.getJsEntryPath()).toBe("");
  });
});
