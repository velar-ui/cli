import type { VelyxConfig, PackageManager, VelyxTheme } from '@/src/types'
import type { IConfigManager } from '@/src/types/interfaces'
import { readVelyxConfig } from '@/src/utils/config'
import { logger } from '@/src/utils/logger'
import { handleError } from '@/src/utils/handle-error'

/**
 * Manages Velyx configuration loading and access
 */
export class ConfigManager implements IConfigManager {
  private config?: VelyxConfig

  /**
   * Load configuration from file
   * @returns Promise resolving to configuration
   * @throws Error if configuration not found or invalid
   */
  async load(): Promise<VelyxConfig> {
    try {
      this.config = readVelyxConfig()
      if (!this.config) {
        logger.error('')
        handleError(new Error('Configuration not found'))
        process.exit(1)
      }
      return this.config
    } catch {
      logger.error('')
      handleError(new Error('Something went wrong. Please try again.'))
      process.exit(1)
    }
  }

  /**
   * Get the package manager from config
   * @returns Package manager name
   * @throws Error if config not loaded
   */
  getPackageManager(): PackageManager {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return (this.config.packageManager || 'npm') as PackageManager
  }

  /**
   * Validate that configuration is loaded
   * @returns True if configuration is valid
   */
  validate(): boolean {
    return !!this.config
  }

  /**
   * Get the components path from config
   * @returns Components directory path
   * @throws Error if config not loaded
   */
  getComponentsPath(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return this.config.components.path
  }

  /**
   * Get the theme CSS path from config
   * @returns Theme CSS file path
   * @throws Error if config not loaded
   */
  getThemePath(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return this.config.css.velyx
  }

  /**
   * Get the JS entry path from config
   * @returns JS entry file path
   * @throws Error if config not loaded
   */
  getJsEntryPath(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return this.config.js?.entry ?? ''
  }

  /**
   * Get the selected theme from config
   * @returns Theme name
   * @throws Error if config not loaded
   */
  getTheme(): VelyxTheme {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return this.config.theme as VelyxTheme
  }
}
