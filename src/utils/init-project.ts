import prompts from 'prompts'
import { FilesystemService } from '@/src/services/filesystem-service'
import { InitService } from '@/src/services/init-service'
import { preFlightInit, type ProjectInfo } from '@/src/utils/preflight-init'
import { getBaseColors } from '@/src/utils/theme'
import { logger } from '@/src/utils/logger'
import { highlighter } from '@/src/utils/highlighter'
import type { VelyxTheme } from '@/src/types'
import { z } from 'zod'

export const initOptionsSchema = z.object({
  baseColor: z.string().optional(),
  yes: z.boolean(),
  defaults: z.boolean(),
  force: z.boolean(),
  cwd: z.string(),
  silent: z.boolean(),
})

export type InitOptions = z.infer<typeof initOptionsSchema>

async function promptTheme(): Promise<VelyxTheme> {
  const baseColors = getBaseColors()
  if (baseColors.length === 0) {
    logger.error('No base colors available.')
    process.exit(1)
  }
  const { theme } = await prompts(
    {
      type: 'select',
      name: 'theme',
      message: 'Choose a base color theme',
      choices: baseColors.map((color) => ({
        title: color.label,
        value: color.name,
      })),
    },
    {
      onCancel: () => {
        logger.error('Theme selection aborted')
        process.exit(1)
      },
    },
  )

  return theme as VelyxTheme
}

async function promptStyleImport(): Promise<boolean> {
  const { shouldImport } = await prompts(
    {
      type: 'confirm',
      name: 'shouldImport',
      message: 'Import Velyx styles into your main CSS file?',
      initial: true,
    },
    {
      onCancel: () => false,
    },
  )

  return Boolean(shouldImport)
}

function resolveThemeFromOptions(options: InitOptions): VelyxTheme | undefined {
  if (!options.baseColor) {
    return undefined
  }

  const baseColors = getBaseColors()
  const matched = baseColors.find((color) => color.name === options.baseColor)
  if (matched) {
    return matched.name
  }

  logger.warn(`Unknown base color "${options.baseColor}".`)
  return undefined
}

export async function initProject(
  options: InitOptions,
  projectInfo?: ProjectInfo | null,
): Promise<void> {
  // Use provided projectInfo or run preflight checks
  if (!projectInfo) {
    const preflight = await preFlightInit(options)
    projectInfo = preflight.projectInfo
  }

  process.chdir(options.cwd)

  const fileSystem = new FilesystemService()
  const initService = new InitService(fileSystem)

  try {
    const validation = initService.validateEnvironment()
    initService.displayEnvironmentInfo(validation)

    // Use the package manager already detected in preflight checks
    const packageManager = projectInfo!.packageManager

    const baseColors = getBaseColors()
    const defaultTheme =
      baseColors.find((color) => color.name === 'neutral')?.name ??
      baseColors[0]?.name

    let theme = resolveThemeFromOptions(options)
    if (!theme) {
      theme =
        options.defaults && defaultTheme ? defaultTheme : await promptTheme()
    }

    if (!theme) {
      logger.error('No base color available.')
      process.exit(1)
    }

    await initService.createComponentsDirectory()
    await initService.createThemeFile(theme)

    let stylesImported = false
    if (validation.cssFile && validation.canInjectCss) {
      if (options.defaults || (await promptStyleImport())) {
        await initService.injectStylesImport(validation.cssFile.path)
        stylesImported = true
      }
    }

    await initService.generateConfig(
      {
        packageManager,
        theme,
        importStyles: stylesImported,
      },
      validation,
    )

    initService.displaySummary(
      {
        packageManager,
        theme,
        importStyles: stylesImported,
      },
      validation,
      stylesImported,
    )
  } catch (error) {
    logger.error((error as Error).message)
    if (error instanceof Error) {
      if (error.message.includes('Laravel project')) {
        logger.log('Run velyx init at the root of a Laravel project')
      } else if (error.message.includes('Tailwind')) {
        logger.log(`Velyx requires ${highlighter.info('Tailwind CSS v4+')}`)
      }
    }
    process.exit(1)
  }
}
