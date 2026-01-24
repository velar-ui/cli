import type {
  VelarConfig,
  PackageManager,
  VelarTheme,
  FileInfo,
} from "../types/index.js";
import type { IFileSystemService } from "../types/interfaces.js";
import { isLaravelProject } from "../utils/laravel.js";
import { readPackageJson, detectTailwindV4 } from "../utils/tailwind.js";
import {
  hasAlpineJs,
  hasLivewire,
  hasInteractivitySupport,
} from "../utils/requirements.js";
import { detectPackageManager } from "../utils/package-manager.js";
import {
  findMainCss,
  hasTailwindImport,
  injectVelarImport,
} from "../utils/css.js";
import { findMainJs } from "../utils/js.js";
import { copyTheme } from "../utils/theme.js";
import { writeVelarConfig } from "../utils/config.js";
import fs from "fs";
import { logger } from "../utils/logger.js";

/**
 * Environment validation result
 */
export interface EnvironmentValidation {
  /** Whether Laravel project is detected */
  isLaravel: boolean;
  /** Whether Tailwind v4 is detected */
  hasTailwindV4: boolean;
  /** Whether Alpine.js is detected */
  hasAlpine: boolean;
  /** Whether Livewire is detected */
  hasLivewire: boolean;
  /** Detected package manager */
  detectedPackageManager: PackageManager;
  /** Main CSS file info if found */
  cssFile: FileInfo | null;
  /** Main JS file info if found */
  jsFile: FileInfo | null;
  /** Whether CSS can be injected */
  canInjectCss: boolean;
}

/**
 * Initialization options
 */
export interface InitOptions {
  /** Selected package manager */
  packageManager: PackageManager;
  /** Selected theme */
  theme: VelarTheme;
  /** Whether to import styles */
  importStyles: boolean;
}

/**
 * Service for handling Velar initialization
 */
export class InitService {
  /**
   * Create a new InitService instance
   * @param fileSystem - File system service
   */
  constructor(private readonly fileSystem: IFileSystemService) {}

  /**
   * Validate the project environment
   * @returns Environment validation result
   * @throws Error if critical requirements are not met
   */
  validateEnvironment(): EnvironmentValidation {
    // Validate Laravel project
    if (!isLaravelProject()) {
      throw new Error("No Laravel project detected");
    }

    // Check Tailwind v4
    const pkg = readPackageJson();
    if (!pkg || !detectTailwindV4(pkg)) {
      throw new Error("Tailwind CSS v4 was not detected");
    }

    // Check interactivity frameworks
    const hasAlpine = hasAlpineJs();
    const hasLivewireSupport = hasLivewire();
    const detectedPm = detectPackageManager();

    // Find CSS and JS files
    const css = findMainCss();
    const js = findMainJs();
    const canInject = css ? hasTailwindImport(css.content) : false;

    return {
      isLaravel: true,
      hasTailwindV4: true,
      hasAlpine,
      hasLivewire: hasLivewireSupport,
      detectedPackageManager: detectedPm,
      cssFile: css,
      jsFile: js,
      canInjectCss: canInject,
    };
  }

  /**
   * Display environment information and warnings
   * @param validation - Environment validation result
   */
  displayEnvironmentInfo(validation: EnvironmentValidation): void {
    // Display interactivity framework status
    if (!hasInteractivitySupport()) {
      logger.warning("No interactivity framework detected");
      logger.step("Velar components work best with Alpine.js or Livewire");
      logger.step(
        `Install Alpine.js: ${validation.detectedPackageManager} install alpinejs`,
      );
      logger.step("Or install Livewire: composer require livewire/livewire");
    } else if (validation.hasAlpine) {
      logger.success(
        "Alpine.js detected - components will be fully interactive",
      );
    } else if (validation.hasLivewire) {
      logger.success("Livewire detected - components will work with Livewire");
    }

    // Display CSS file status
    if (!validation.cssFile) {
      logger.warning("No main CSS file found");
      logger.step("Styles will be created but not auto-imported");
    } else if (!validation.canInjectCss) {
      logger.warning("Tailwind import not found in CSS");
      logger.step("Velar styles will not be auto-imported");
    }

    // Display JS file status
    if (!validation.jsFile) {
      logger.warning("No main JS file found");
      logger.step("Component scripts will not be auto-imported");
    }
  }

  /**
   * Create the UI components directory
   * @param path - Directory path (default: "resources/views/components/ui")
   * @returns Promise that resolves when directory is created
   */
  async createComponentsDirectory(
    path = "resources/views/components/ui",
  ): Promise<void> {
    await this.fileSystem.ensureDir(path);
  }

  /**
   * Create the Velar theme CSS file
   * @param theme - Theme to use
   * @param targetPath - Target CSS file path (default: "resources/css/velar.css")
   * @returns Promise that resolves when theme is created
   * @throws Error if theme creation fails
   */
  async createThemeFile(
    theme: VelarTheme,
    targetPath = "resources/css/velar.css",
  ): Promise<void> {
    // Ensure directory exists
    const dirPath = targetPath.split("/").slice(0, -1).join("/");
    await this.fileSystem.ensureDir(dirPath);

    // Create theme file if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      try {
        copyTheme(theme, targetPath);
        logger.success("Velar theme created");
        logger.info(targetPath);
      } catch (error) {
        throw new Error(
          `Failed to create theme file: ${(error as Error).message}`,
        );
      }
    } else {
      logger.info("velar.css already exists");
    }
  }

  /**
   * Inject Velar styles import into main CSS file
   * @param cssPath - Path to main CSS file
   * @returns Promise that resolves when import is injected
   */
  async injectStylesImport(cssPath: string): Promise<void> {
    injectVelarImport(cssPath);
    logger.success("Velar styles imported");
    logger.info(cssPath);
  }

  /**
   * Generate and write Velar configuration file
   * @param options - Initialization options
   * @param validation - Environment validation result
   * @returns Promise that resolves when config is written
   */
  async generateConfig(
    options: InitOptions,
    validation: EnvironmentValidation,
  ): Promise<void> {
    const config: VelarConfig = {
      version: "0.1",
      theme: options.theme,
      packageManager: options.packageManager,
      css: {
        entry: validation.cssFile?.path ?? "",
        velar: "resources/css/velar.css",
      },
      js: {
        entry: validation.jsFile?.path ?? "",
      },
      components: {
        path: "resources/views/components/ui",
      },
    };

    writeVelarConfig(config);
    logger.success("velar.json config generated");
  }

  /**
   * Display initialization summary
   * @param options - Initialization options
   * @param validation - Environment validation result
   * @param stylesImported - Whether styles were imported
   */
  displaySummary(
    options: InitOptions,
    validation: EnvironmentValidation,
    stylesImported: boolean,
  ): void {
    console.log("\n---");
    logger.success("Laravel project detected");
    logger.success("Tailwind CSS v4 detected");
    logger.success(`Theme selected: ${options.theme}`);
    logger.success(`Package manager: ${options.packageManager}`);
    logger.success("UI components directory ready");
    if (validation.jsFile) {
      logger.success("Main JS file detected");
    }
    logger.success(
      stylesImported ? "Styles import complete" : "Styles import pending",
    );
    logger.success("velar.json created");
    console.log("\nNext steps:");
    console.log("  velar add button");
    console.log(
      "\n💡 Want to customize your Tailwind palette? Try https://tweakcn.com/ — a visual generator for Tailwind-compatible color scales.",
    );
  }
}
