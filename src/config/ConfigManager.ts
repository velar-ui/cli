import type { VelarConfig } from "../types/index.js";
import { readVelarConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export class ConfigManager {
  private config?: VelarConfig;

  async load(): Promise<VelarConfig> {
    try {
      this.config = readVelarConfig();
      if (!this.config) {
        throw new Error("Configuration not found");
      }
      return this.config;
    } catch (error) {
      logger.error("Failed to load configuration");
      throw error;
    }
  }

  getPackageManager(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.packageManager || "npm";
  }

  validate(): boolean {
    return !!this.config;
  }

  getComponentsPath(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.components.path;
  }

  getThemePath(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.css.velar;
  }

  getTheme(): string {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    return this.config.theme;
  }
}
