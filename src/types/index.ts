/**
 * Supported file types for Velar components
 */
export type VelarFileType = "blade" | "js" | "css";

/**
 * Supported package managers
 */
export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Available color themes
 */
export type VelarTheme =
  | "neutral"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "rose"
  | "violet"
  | "yellow";

/**
 * Represents a file in a Velar component
 */
export interface VelarComponentFile {
  /** File type */
  type: VelarFileType;
  /** Relative file path */
  path: string;
}

/**
 * Component dependencies
 */
export interface VelarDependency {
  /** Composer (PHP) dependencies */
  composer?: readonly string[];
  /** npm/yarn/pnpm/bun dependencies */
  npm?: readonly string[];
}

/**
 * Velar component metadata
 */
export interface VelarComponentMeta {
  /** Unique component name */
  name: string;
  /** Component description */
  description?: string;
  /** Component categories */
  categories?: readonly string[];
  /** List of component files */
  files: readonly VelarComponentFile[];
  /** Component dependencies */
  dependencies?: VelarDependency;
  /** Component path in registry */
  path: string;
}

/**
 * Velar registry data
 */
export interface RegistryData {
  /** List of available components */
  components: readonly VelarComponentMeta[];
}

/**
 * Velar configuration for a project
 */
export interface VelarConfig {
  /** Configuration version */
  version: string;
  /** Selected color theme */
  theme: VelarTheme;
  /** Package manager used */
  packageManager: PackageManager;
  /** CSS configuration */
  css: {
    /** Main CSS file path */
    entry: string;
    /** Velar CSS file path */
    velar: string;
  };
  /** JS configuration */
  js: {
    /** Main JS file path */
    entry: string;
  };
  /** Components configuration */
  components: {
    /** Path where components are stored */
    path: string;
  };
}

/**
 * GitHub API file representation
 */
export interface GitHubFile {
  /** File name */
  name: string;
  /** Full file path */
  path: string;
  /** File SHA */
  sha: string;
  /** File size in bytes */
  size: number;
  /** API URL */
  url: string;
  /** HTML URL */
  html_url: string;
  /** Git URL */
  git_url: string;
  /** Direct download URL */
  download_url: string | null;
  /** File type */
  type: "file" | "dir";
  /** Associated links */
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * Component that failed during addition
 */
export interface FailedComponent {
  /** Component name */
  name: string;
  /** Error message */
  error: string;
}

/**
 * Result of adding components
 */
export interface AddResult {
  /** Names of successfully added files */
  added: readonly string[];
  /** Names of skipped files */
  skipped: readonly string[];
  /** Components that failed */
  failed: readonly FailedComponent[];
}

/**
 * Component list with categories
 */
export interface ComponentList {
  /** List of components */
  components: readonly VelarComponentMeta[];
  /** List of available categories */
  categories: readonly string[];
}

/**
 * Main file information (CSS or JS)
 */
export interface FileInfo {
  /** File path */
  path: string;
  /** File content */
  content: string;
}

/**
 * Retry options for network requests
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Delay multiplication factor */
  backoffFactor?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** HTTP status codes to retry */
  retryableStatusCodes?: readonly number[];
}

/**
 * Network request options
 */
export interface FetchOptions extends RetryOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}
