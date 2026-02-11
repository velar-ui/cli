import { ConfigManager } from '@/src/config/config-manager'
import { AddService } from '@/src/services/add-service'
import { RegistryService } from '@/src/services/registry-service'
import { logger } from '@/src/utils/logger'
import { z } from 'zod'
import prompts from 'prompts'

export type AddOptions = {
  components?: string[]
  yes: boolean
  overwrite: boolean
  cwd: string
  all: boolean
  path?: string
  silent: boolean
  srcDir?: boolean
  cssVariables?: boolean
}

async function promptForRegistryComponents(
  options: AddOptions,
  availableComponents: readonly string[],
): Promise<string[]> {
  if (options.all) {
    return [...availableComponents]
  }

  if (options.components?.length) {
    return options.components
  }

  logger.info('Use arrow keys and space to select, then press enter.')

  const { components } = await prompts({
    type: 'multiselect',
    name: 'components',
    message: 'Which components would you like to add?',
    hint: 'Space to select. A to toggle all. Enter to submit.',
    instructions: false,
    choices: availableComponents.map((name) => ({
      title: name,
      value: name,
      selected: options.all ? true : options.components?.includes(name),
    })),
  })

  if (!components?.length) {
    logger.warn('No components selected. Exiting.')
    logger.info('')
    process.exit(1)
  }

  const result = z.array(z.string()).safeParse(components)
  if (!result.success) {
    logger.error('Something went wrong. Please try again.')
    process.exit(1)
  }

  return result.data
}

export async function addComponents(options: AddOptions): Promise<void> {
  const configManager = new ConfigManager()
  await configManager.load()

  const registryService = new RegistryService()
  const addService = new AddService(registryService, configManager)

  try {
    addService.validateInitialization()
  } catch {
    logger.error('Velyx is not initialized')
    logger.log('Run velyx init first')
    process.exit(1)
  }

  const registry = await addService.getAvailableComponents()

  const available = registry.components
    .map((component: { name: string }) => component.name)
    .sort((a: string, b: string) => a.localeCompare(b))
  const componentNames = await promptForRegistryComponents(options, available)

  try {
    addService.validateComponents(componentNames, registry)
  } catch (err) {
    logger.error((err as Error).message)
    logger.log('Run velyx list to see available components')
    process.exit(1)
  }

  const result = await addService.addComponents(componentNames)
  addService.displayResults(result)
  addService.displayNextSteps(result)
}
