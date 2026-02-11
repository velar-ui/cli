/**
 * Supported file types for Velyx components
 */
export type VelyxFileType = 'blade' | 'js' | 'css'

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

/**
 * Available color themes
 */
export type VelyxTheme = 'neutral' | 'gray' | 'slate' | 'stone' | 'zinc'

/**
 * Represents a file in a Velyx component
 */
export interface VelyxComponentFile {
  /** File type */
  type: VelyxFileType
  /** Relative file path */
  path: string
}

/**
 * Component dependencies
 */
export interface VelyxDependency {
  /** Composer (PHP) dependencies */
  composer?: readonly string[]
  /** npm/yarn/pnpm/bun dependencies */
  npm?: readonly string[]
}

/**
 * Velyx component metadata
 */
export interface VelyxComponentMeta {
  /** Unique component name */
  name: string
  /** Component description */
  description?: string
  /** Component categories */
  categories?: readonly string[]
  /** List of component files */
  files: readonly VelyxComponentFile[]
  /** Component dependencies */
  dependencies?: VelyxDependency
  /** Component path in registry */
  path: string
}

/**
 * Velyx registry data
 */
export interface RegistryData {
  /** List of available components */
  components: readonly VelyxComponentMeta[]
}

/**
 * Velyx configuration for a project
 */
export interface VelyxConfig {
  /** Configuration version */
  version: string
  /** Selected color theme */
  theme: VelyxTheme
  /** Package manager used */
  packageManager: PackageManager
  /** CSS configuration */
  css: {
    /** Main CSS file path */
    entry: string
    /** Velyx CSS file path */
    velyx: string
  }
  /** JS configuration */
  js: {
    /** Main JS file path */
    entry: string
  }
  /** Components configuration */
  components: {
    /** Path where components are stored */
    path: string
  }
}

/**
 * GitHub API file representation
 */
export interface GitHubFile {
  /** File name */
  name: string
  /** Full file path */
  path: string
  /** File SHA */
  sha: string
  /** File size in bytes */
  size: number
  /** API URL */
  url: string
  /** HTML URL */
  html_url: string
  /** Git URL */
  git_url: string
  /** Direct download URL */
  download_url: string | null
  /** File type */
  type: 'file' | 'dir'
  /** Associated links */
  _links: {
    self: string
    git: string
    html: string
  }
}

/**
 * Component that failed during addition
 */
export interface FailedComponent {
  /** Component name */
  name: string
  /** Error message */
  error: string
}

/**
 * Result of adding components
 */
export interface AddResult {
  /** Names of successfully added files */
  added: readonly string[]
  /** Names of skipped files */
  skipped: readonly string[]
  /** Components that failed */
  failed: readonly FailedComponent[]
}

/**
 * Component list with categories
 */
export interface ComponentList {
  /** List of components */
  components: readonly VelyxComponentMeta[]
  /** List of available categories */
  categories: readonly string[]
}

/**
 * Main file information (CSS or JS)
 */
export interface FileInfo {
  /** File path */
  path: string
  /** File content */
  content: string
}

/**
 * Retry options for network requests
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Initial delay in milliseconds */
  initialDelay?: number
  /** Delay multiplication factor */
  backoffFactor?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** HTTP status codes to retry */
  retryableStatusCodes?: readonly number[]
}

/**
 * Network request options
 */
export interface FetchOptions extends RetryOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
}
