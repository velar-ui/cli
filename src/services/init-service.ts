import type {
  VelyxConfig,
  PackageManager,
  VelyxTheme,
  FileInfo,
} from '@/src/types'
import type { IFileSystemService } from '../types/interfaces'
import { isLaravelProject } from '../utils/laravel'
import { readPackageJson, detectTailwindV4 } from '../utils/tailwind'
import { hasAlpineJs } from '../utils/requirements'
import { detectPackageManager } from '../utils/package-manager'
import { findMainCss, hasTailwindImport, injectVelyxImport } from '../utils/css'
import { findMainJs } from '../utils/js'
import { copyTheme } from '../utils/theme'
import { writeVelyxConfig } from '../utils/config'
import fs from 'fs'
import { logger } from '../utils/logger'
import packageJson from '../../package.json'

/**
 * Environment validation result
 */
export interface EnvironmentValidation {
  /** Whether Laravel project is detected */
  isLaravel: boolean
  /** Whether Tailwind v4 is detected */
  hasTailwindV4: boolean
  /** Whether Alpine.js is detected */
  hasAlpine: boolean
  /** Detected package manager */
  detectedPackageManager: PackageManager
  /** Main CSS file info if found */
  cssFile: FileInfo | null
  /** Main JS file info if found */
  jsFile: FileInfo | null
  /** Whether CSS can be injected */
  canInjectCss: boolean
}

/**
 * Initialization options
 */
export interface InitOptions {
  /** Selected package manager */
  packageManager: PackageManager
  /** Selected theme */
  theme: VelyxTheme
  /** Whether to import styles */
  importStyles: boolean
}

/**
 * Service for handling Velyx initialization
 */
export class InitService {
  /**
   * Create a new InitService instance
   * @param fileSystem - File system service
   */
  constructor(private readonly fileSystem: IFileSystemService) { }

  /**
   * Validate the project environment
   * @returns Environment validation result
   * @throws Error if critical requirements are not met
   */
  validateEnvironment(): EnvironmentValidation {
    // Validate Laravel project
    if (!isLaravelProject()) {
      throw new Error('No Laravel project detected')
    }

    // Check Tailwind v4
    const pkg = readPackageJson()
    if (!pkg || !detectTailwindV4(pkg)) {
      throw new Error('Tailwind CSS v4 was not detected')
    }

    // Check interactivity frameworks
    const hasAlpine = hasAlpineJs()
    const detectedPm = detectPackageManager()

    // Find CSS and JS files
    const css = findMainCss()
    const js = findMainJs()
    const canInject = css ? hasTailwindImport(css.content) : false

    return {
      isLaravel: true,
      hasTailwindV4: true,
      hasAlpine,
      detectedPackageManager: detectedPm,
      cssFile: css,
      jsFile: js,
      canInjectCss: canInject,
    }
  }

  /**
   * Display environment information and warnings
   * @param validation - Environment validation result
   */
  displayEnvironmentInfo(validation: EnvironmentValidation): void {
    // Display interactivity framework status
    if (!validation.hasAlpine) {
      logger.warn('Alpine.js not detected')
      logger.log(
        `Install Alpine.js: ${validation.detectedPackageManager} install alpinejs`,
      )
    } else {
      logger.success(
        'Alpine.js detected - components will be fully interactive',
      )
    }

    // Display CSS file status
    if (!validation.cssFile) {
      logger.warn('No main CSS file found')
      logger.log('Styles will be created but not auto-imported')
    } else if (!validation.canInjectCss) {
      logger.warn('Tailwind import not found in CSS')
      logger.log('Velyx styles will not be auto-imported')
    }

    // Display JS file status
    if (!validation.jsFile) {
      logger.warn('No main JS file found')
      logger.log('Component scripts will not be auto-imported')
    }
  }

  /**
   * Create the UI components directory
   * @param path - Directory path (default: "resources/views/components/ui")
   * @returns Promise that resolves when directory is created
   */
  async createComponentsDirectory(
    path = 'resources/views/components/ui',
  ): Promise<void> {
    await this.fileSystem.ensureDir(path)
  }

  /**
   * Create the Velyx theme CSS file
   * @param theme - Theme to use
   * @param targetPath - Target CSS file path (default: "resources/css/velyx.css")
   * @returns Promise that resolves when theme is created
   * @throws Error if theme creation fails
   */
  async createThemeFile(
    theme: VelyxTheme,
    targetPath = 'resources/css/velyx.css',
  ): Promise<void> {
    // Ensure directory exists
    const dirPath = targetPath.split('/').slice(0, -1).join('/')
    await this.fileSystem.ensureDir(dirPath)

    // Create theme file if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      try {
        copyTheme(theme, targetPath)
        logger.success('Velyx theme created')
        logger.info(targetPath)
      } catch (error) {
        throw new Error(
          `Failed to create theme file: ${(error as Error).message}`,
        )
      }
    } else {
      logger.info('velyx.css already exists')
    }
  }

  /**
   * Inject Velyx styles import into main CSS file
   * @param cssPath - Path to main CSS file
   * @returns Promise that resolves when import is injected
   */
  async injectStylesImport(cssPath: string): Promise<void> {
    injectVelyxImport(cssPath)
    logger.success('Velyx styles imported')
    logger.info(cssPath)
  }

  /**
   * Generate and write Velyx configuration file
   * @param options - Initialization options
   * @param validation - Environment validation result
   * @returns Promise that resolves when config is written
   */
  async generateConfig(
    options: InitOptions,
    validation: EnvironmentValidation,
  ): Promise<void> {
    const config: VelyxConfig = {
      version: packageJson.version as string,
      theme: options.theme,
      packageManager: options.packageManager,
      css: {
        entry: validation.cssFile?.path ?? '',
        velyx: 'resources/css/velyx.css',
      },
      js: {
        entry: validation.jsFile?.path ?? '',
      },
      components: {
        path: 'resources/views/components/ui',
      },
    }

    writeVelyxConfig(config)
    logger.success('velyx.json config generated')
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
    console.log('\n---')
    logger.success('Laravel project detected')
    logger.success('Tailwind CSS v4 detected')
    logger.success(`Theme selected: ${options.theme}`)
    logger.success(`Package manager: ${options.packageManager}`)
    logger.success('UI components directory ready')
    if (validation.jsFile) {
      logger.success('Main JS file detected')
    }
    logger.success(
      stylesImported ? 'Styles import complete' : 'Styles import pending',
    )
    logger.success('velyx.json created')
    console.log('\nNext steps:')
    console.log('  velyx add button')
    console.log(
      '\n💡 Want to customize your Tailwind palette? Try https://tweakcn.com/ — a visual generator for Tailwind-compatible color scales.',
    )
  }
}
