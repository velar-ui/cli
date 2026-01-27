import type { VelarComponentMeta } from "./index";

/**
 * Interface for registry service operations
 */
export interface IRegistryService {
  /**
   * Fetch the complete registry data
   * @returns Promise resolving to registry data
   * @throws NetworkError if fetch fails
   */
  fetchRegistry(): Promise<import("../types/index").RegistryData>;

  /**
   * Fetch metadata for a specific component
   * @param name - Component name
   * @returns Promise resolving to component metadata
   * @throws ComponentNotFoundError if component doesn't exist
   * @throws NetworkError if fetch fails
   */
  fetchComponent(name: string): Promise<VelarComponentMeta>;

  /**
   * Fetch file content for a component
   * @param componentUrl - Component URL or name
   * @param path - File path within component
   * @returns Promise resolving to file content
   * @throws ComponentNotFoundError if component or file doesn't exist
   * @throws NetworkError if fetch fails
   */
  fetchFile(componentUrl: string, path: string): Promise<string>;

  /**
   * Resolve component dependencies
   * @param component - Component metadata
   * @returns Promise resolving to array of components including dependencies
   */
  resolveDependencies(
    component: VelarComponentMeta,
  ): Promise<readonly VelarComponentMeta[]>;
}

/**
 * Interface for file system operations
 */
export interface IFileSystemService {
  /**
   * Check if a file exists
   * @param filePath - Path to check
   * @returns Promise resolving to true if file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Write content to a file
   * @param filePath - Path to write to
   * @param content - Content to write
   * @returns Promise that resolves when file is written
   */
  writeFile(filePath: string, content: string): Promise<void>;

  /**
   * Read content from a file
   * @param filePath - Path to read from
   * @returns Promise resolving to file content
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath - Directory path
   * @returns Promise that resolves when directory is ensured
   */
  ensureDir(dirPath: string): Promise<void>;
}

/**
 * Interface for configuration management
 */
export interface IConfigManager {
  /**
   * Load configuration from file
   * @returns Promise resolving to configuration
   * @throws Error if configuration not found or invalid
   */
  load(): Promise<import("../types/index").VelarConfig>;

  /**
   * Get the package manager from config
   * @returns Package manager name
   * @throws Error if config not loaded
   */
  getPackageManager(): import("../types/index").PackageManager;

  /**
   * Validate that configuration is loaded
   * @returns True if configuration is valid
   */
  validate(): boolean;

  /**
   * Get the components path from config
   * @returns Components directory path
   * @throws Error if config not loaded
   */
  getComponentsPath(): string;

  /**
   * Get the theme CSS path from config
   * @returns Theme CSS file path
   * @throws Error if config not loaded
   */
  getThemePath(): string;

  /**
   * Get the JS entry path from config
   * @returns JS entry file path
   * @throws Error if config not loaded
   */
  getJsEntryPath(): string;

  /**
   * Get the selected theme from config
   * @returns Theme name
   * @throws Error if config not loaded
   */
  getTheme(): import("../types/index").VelarTheme;
}
