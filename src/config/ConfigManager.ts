import type {
  VelarConfig,
  PackageManager,
  VelarTheme,
} from "../types/index.js";
import type { IConfigManager } from "../types/interfaces.js";
import { readVelarConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Manages Velar configuration loading and access
 */
export class ConfigManager implements IConfigManager {
  private config?: VelarConfig;

  /**
   * Load configuration from file
   * @returns Promise resolving to configuration
   * @throws Error if configuration not found or invalid
   */
  async load(): Promise<VelarConfig> {
    try {
      this.config = readVelarConfig();
      if (!this.config) {
        throw new Error("Configuration not found");
      }
      return this.config;
    } catch (error) {
      logger.error("Failed to load configuration", (error as Error).message);
      throw error;
    }
  }

  /**
   * Get the package manager from config
   * @returns Package manager name
   * @throws Error if config not loaded
   */
  getPackageManager(): PackageManager {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return (this.config.packageManager || "npm") as PackageManager;
  }

  /**
   * Validate that configuration is loaded
   * @returns True if configuration is valid
   */
  validate(): boolean {
    return !!this.config;
  }

  /**
   * Get the components path from config
   * @returns Components directory path
   * @throws Error if config not loaded
   */
  getComponentsPath(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.components.path;
  }

  /**
   * Get the theme CSS path from config
   * @returns Theme CSS file path
   * @throws Error if config not loaded
   */
  getThemePath(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.css.velar;
  }

  /**
   * Get the JS entry path from config
   * @returns JS entry file path
   * @throws Error if config not loaded
   */
  getJsEntryPath(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.js?.entry ?? "";
  }

  /**
   * Get the selected theme from config
   * @returns Theme name
   * @throws Error if config not loaded
   */
  getTheme(): VelarTheme {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.theme as VelarTheme;
  }
}
