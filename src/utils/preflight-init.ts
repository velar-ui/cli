import { exec } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { promisify } from 'util'
import { highlighter } from '@/src/utils/highlighter'
import { logger } from '@/src/utils/logger'
import { spinner } from '@/src/utils/spinner'
import prompts from 'prompts'
import { detectPackageManager } from '@/src/utils/package-manager'
import type { InitOptions } from '@/src/utils/init-project'
import type { PackageManager } from '@/src/types'

const execAsync = promisify(exec)

export interface ProjectInfo {
  name: string
  framework: {
    name: string
    label: string
    version?: string
  }
  hasAlpine: boolean
  hasVite: boolean
  packageManager: PackageManager
  paths: {
    views: string
    assets: string
    public: string
    config: string
  }
}

export async function getProjectInfo(cwd: string): Promise<ProjectInfo | null> {
  try {
    const composerPath = path.resolve(cwd, 'composer.json')
    const packagePath = path.resolve(cwd, 'package.json')

    if (!fs.existsSync(composerPath)) {
      return null
    }

    const composer = await fs.readJson(composerPath)
    const isLaravel =
      composer.require?.['laravel/framework'] ||
      composer.require?.['illuminate/foundation']

    if (!isLaravel) {
      return null
    }

    // Détecter le package manager
    const originalDir = process.cwd()
    process.chdir(cwd)
    const pkgManager = detectPackageManager()
    console.log(`Detected package manager: ${pkgManager}`)
    process.chdir(originalDir)

    const projectInfo: ProjectInfo = {
      name: composer.name || path.basename(cwd),
      framework: {
        name: 'laravel',
        label: 'Laravel',
        version: composer.require?.['laravel/framework'] || 'unknown',
      },
      hasAlpine: false,
      hasVite: false,
      packageManager: pkgManager,
      paths: {
        views: 'resources/views',
        assets: 'resources/js',
        public: 'public',
        config: 'config',
      },
    }

    // Vérifier les dépendances frontend
    if (fs.existsSync(packagePath)) {
      const pkg = await fs.readJson(packagePath)
      projectInfo.hasAlpine = !!(
        pkg.dependencies?.alpinejs || pkg.devDependencies?.alpinejs
      )
      projectInfo.hasVite = !!pkg.devDependencies?.vite
    }

    // Vérifier la structure des dossiers
    const viewsPath = path.resolve(cwd, 'resources/views')
    const assetsPath = path.resolve(cwd, 'resources/js')

    if (fs.existsSync(viewsPath)) {
      projectInfo.paths.views = 'resources/views'
    }

    if (fs.existsSync(assetsPath)) {
      projectInfo.paths.assets = 'resources/js'
    }

    return projectInfo
  } catch {
    return null
  }
}

export async function preFlightInit(options: InitOptions): Promise<{
  errors: Record<string, boolean>
  projectInfo: ProjectInfo | null
}> {
  const errors: Record<string, boolean> = {}

  // Vérifier si le répertoire existe
  if (!fs.existsSync(options.cwd)) {
    errors['MISSING_DIR'] = true
    return { errors, projectInfo: null }
  }

  const projectSpinner = spinner.start('Checking project environment...')

  // Vérifier si velyx.json existe déjà
  const velyxConfigPath = path.resolve(options.cwd, 'velyx.json')
  if (fs.existsSync(velyxConfigPath) && !options.force) {
    projectSpinner.fail()
    logger.break()

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: `A ${highlighter.info('velyx.json')} file already exists. What would you like to do?`,
      choices: [
        {
          title: 'Re-initialize Velyx configuration',
          value: 'reinit',
        },
        {
          title: 'Keep existing configuration',
          value: 'keep',
        },
        {
          title: 'Exit',
          value: 'exit',
        },
      ],
      initial: 0,
    })

    if (action === 'exit') {
      logger.log('Operation cancelled.')
      process.exit(0)
    }

    if (action === 'keep') {
      logger.log('Keeping existing configuration.')
      process.exit(0)
    }

    // Continue with re-initialization
    logger.log(`Re-initializing Velyx configuration...`)
  }

  // Récupérer les infos du projet
  const projectInfo = await getProjectInfo(options.cwd)

  if (!projectInfo || projectInfo.framework.name !== 'laravel') {
    errors['UNSUPPORTED_PROJECT'] = true
    projectSpinner.fail()
    logger.break()
    logger.error(
      `We could not detect a supported Laravel project at ${highlighter.info(
        options.cwd,
      )}.\nVelyx is designed to work with Laravel projects.`,
    )
    logger.break()
    process.exit(1)
  }

  projectSpinner.succeed(
    `Found ${highlighter.info(projectInfo.framework.label)} project`,
  )

  // Vérifier Alpine.js
  const alpineSpinner = spinner.start('Checking Alpine.js...')

  if (!projectInfo.hasAlpine) {
    alpineSpinner.fail()
    logger.break()
    logger.warn(`Alpine.js is required but not found in your project.`)

    // Proposer d'installer Alpine.js directement
    const { installAlpine } = await prompts({
      type: 'confirm',
      name: 'installAlpine',
      message: 'Would you like to install Alpine.js now?',
      initial: true,
    })

    if (installAlpine) {
      // Installer Alpine.js avec le package manager détecté
      const pkgManager = projectInfo.packageManager
      const installSpinner = spinner.start(
        `Installing Alpine.js with ${pkgManager}...`,
      )

      try {
        await execAsync(`${pkgManager} install alpinejs`, {
          cwd: options.cwd,
        })
        installSpinner.succeed('Alpine.js installed successfully')
        projectInfo.hasAlpine = true
      } catch (error) {
        installSpinner.fail(
          `Failed to install Alpine.js: ${(error as Error).message}`,
        )
        logger.error(
          `Please install Alpine.js manually: ${highlighter.info(`${pkgManager} install alpinejs`)}`,
        )
        logger.break()
        process.exit(1)
      }
    } else {
      const pkgManager = projectInfo.packageManager
      logger.error(
        `Alpine.js is required. Install it with: ${highlighter.info(`${pkgManager} install alpinejs`)}`,
      )
      logger.break()
      process.exit(1)
    }
  } else {
    alpineSpinner.succeed('Alpine.js found')
  }

  // Vérifier Vite (recommandé pour Velyx)
  const viteSpinner = spinner.start('Checking build tools...')

  if (!projectInfo.hasVite) {
    logger.warn(
      `Vite not found. Using Vite is recommended for better development experience.`,
    )
    viteSpinner.warn('Vite not found (but optional)')
  } else {
    viteSpinner.succeed('Vite found')
  }

  // Afficher les erreurs bloquantes
  if (Object.keys(errors).length > 0) {
    logger.break()
    process.exit(1)
  }

  return { errors, projectInfo }
}
