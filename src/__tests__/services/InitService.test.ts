import { describe, it, expect, vi, beforeEach } from "vitest";
import { InitService } from "../../services/InitService.js";
import { IFileSystemService } from "../../types/interfaces.js";
import * as laravelUtils from "../../utils/laravel.js";
import * as tailwindUtils from "../../utils/tailwind.js";
import * as packageManagerUtils from "../../utils/package-manager.js";
import * as cssUtils from "../../utils/css.js";
import * as configUtils from "../../utils/config.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";

vi.mock("fs");
vi.mock("../utils/laravel.js");
vi.mock("../utils/tailwind.js");
vi.mock("../utils/package-manager.js");
vi.mock("../utils/css.js");
vi.mock("../utils/config.js");
vi.mock("../utils/requirements.js", () => ({
  hasAlpineJs: vi.fn().mockReturnValue(true),
  hasLivewire: vi.fn().mockReturnValue(true),
  hasInteractivitySupport: vi.fn().mockReturnValue(true),
}));
vi.mock("../utils/theme.js", () => ({
  copyTheme: vi.fn(),
}));

describe("InitService", () => {
  let initService: InitService;
  let mockFileSystem: vi.Mocked<IFileSystemService>;

  beforeEach(() => {
    mockFileSystem = {
      ensureDir: vi.fn(),
      writeFile: vi.fn(),
      fileExists: vi.fn(),
      readFile: vi.fn(),
    } as any;

    initService = new InitService(mockFileSystem);
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("validateEnvironment", () => {
    it("should return validation result if all requirements met", () => {
      vi.mocked(laravelUtils.isLaravelProject).mockReturnValue(true);
      vi.mocked(tailwindUtils.readPackageJson).mockReturnValue({});
      vi.mocked(tailwindUtils.detectTailwindV4).mockReturnValue(true);
      vi.mocked(packageManagerUtils.detectPackageManager).mockReturnValue("pnpm");
      vi.mocked(cssUtils.findMainCss).mockReturnValue({ path: "app.css", content: "@import 'tailwind';" });
      vi.mocked(cssUtils.hasTailwindImport).mockReturnValue(true);

      const result = initService.validateEnvironment();

      expect(result.isLaravel).toBe(true);
      expect(result.hasTailwindV4).toBe(true);
      expect(result.detectedPackageManager).toBe("pnpm");
    });

    it("should throw if not a Laravel project", () => {
      vi.mocked(laravelUtils.isLaravelProject).mockReturnValue(false);
      expect(() => initService.validateEnvironment()).toThrow("No Laravel project detected");
    });

    it("should throw if Tailwind v4 not detected", () => {
      vi.mocked(laravelUtils.isLaravelProject).mockReturnValue(true);
      vi.mocked(tailwindUtils.readPackageJson).mockReturnValue({});
      vi.mocked(tailwindUtils.detectTailwindV4).mockReturnValue(false);
      expect(() => initService.validateEnvironment()).toThrow("Tailwind CSS v4 was not detected");
    });
  });

  describe("createComponentsDirectory", () => {
    it("should create directory with default path", async () => {
      await initService.createComponentsDirectory();
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith("resources/views/components/ui");
    });
  });

  describe("generateConfig", () => {
    it("should call writeVelarConfig", async () => {
      const options = { packageManager: "npm" as const, theme: "neutral" as const, importStyles: true };
      const validation = { cssFile: { path: "app.css", content: "" }, jsFile: { path: "app.js", content: "" } } as any;
      
      await initService.generateConfig(options, validation);
      
      expect(configUtils.writeVelarConfig).toHaveBeenCalled();
      const config = vi.mocked(configUtils.writeVelarConfig).mock.calls[0]?.[0];
      expect(config?.js.entry).toBe("app.js");
    });
  });

  describe("displayEnvironmentInfo", () => {
    it("should log warnings if CSS or JS missing", () => {
      const spyWarning = vi.spyOn(logger, "warning");
      const validation = {
        cssFile: null,
        jsFile: null,
        canInjectCss: false,
        hasAlpine: false,
        hasLivewire: false,
        detectedPackageManager: "npm"
      } as any;

      initService.displayEnvironmentInfo(validation);
      expect(spyWarning).toHaveBeenCalledWith("No main CSS file found");
      expect(spyWarning).toHaveBeenCalledWith("No main JS file found");
    });

    it("should log success if Alpine is detected", () => {
      const spySuccess = vi.spyOn(logger, "success");
      const validation = {
        cssFile: {},
        jsFile: {},
        canInjectCss: true,
        hasAlpine: true,
        hasLivewire: false,
        detectedPackageManager: "npm"
      } as any;

      initService.displayEnvironmentInfo(validation);
      expect(spySuccess).toHaveBeenCalledWith(expect.stringContaining("Alpine.js detected"));
    });

    it("should log success if Livewire is detected", () => {
      const spySuccess = vi.spyOn(logger, "success");
      const validation = {
        cssFile: {},
        jsFile: {},
        canInjectCss: true,
        hasAlpine: false,
        hasLivewire: true,
        detectedPackageManager: "npm"
      } as any;

      initService.displayEnvironmentInfo(validation);
      expect(spySuccess).toHaveBeenCalledWith(expect.stringContaining("Livewire detected"));
    });
  });

  describe("createThemeFile", () => {
    it("should create theme file if it doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const themeUtils = await import("../../utils/theme.js");
      
      await initService.createThemeFile("blue");
      
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith("resources/css");
      expect(themeUtils.copyTheme).toHaveBeenCalledWith("blue", "resources/css/velar.css");
    });

    it("should skip if theme file already exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const spyInfo = vi.spyOn(logger, "info");
      
      await initService.createThemeFile("blue");
      
      expect(spyInfo).toHaveBeenCalledWith("velar.css already exists");
    });
  });

  describe("injectStylesImport", () => {
    it("should call injectVelarImport", async () => {
      await initService.injectStylesImport("app.css");
      expect(cssUtils.injectVelarImport).toHaveBeenCalledWith("app.css");
    });
  });
});
