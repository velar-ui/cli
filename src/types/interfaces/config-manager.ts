import type { VelyxConfig, VelyxTheme, PackageManager } from '..'

/**
 * Interface for configuration management
 */
export interface IConfigManager {
  /**
   * Load configuration from file
   * @returns Promise resolving to configuration
   * @throws Error if configuration not found or invalid
   */
  load(): Promise<VelyxConfig>

  /**
   * Get the package manager from config
   * @returns Package manager name
   * @throws Error if config not loaded
   */
  getPackageManager(): PackageManager

  /**
   * Validate that configuration is loaded
   * @returns True if configuration is valid
   */
  validate(): boolean

  /**
   * Get the components path from config
   * @returns Components directory path
   * @throws Error if config not loaded
   */
  getComponentsPath(): string

  /**
   * Get the theme CSS path from config
   * @returns Theme CSS file path
   * @throws Error if config not loaded
   */
  getThemePath(): string

  /**
   * Get the JS entry path from config
   * @returns JS entry file path
   * @throws Error if config not loaded
   */
  getJsEntryPath(): string

  /**
   * Get the selected theme from config
   * @returns Theme name
   * @throws Error if config not loaded
   */
  getTheme(): VelyxTheme
}
