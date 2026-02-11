import chalk from 'chalk'
import Table from 'cli-table3'
import type { VelyxComponentMeta } from '@/src/types'
import { RegistryService } from '@/src/services/registry-service'
import { logger } from '@/src/utils/logger'

export type ListOptions = {
  query?: string
  limit?: number
  offset?: number
  json: boolean
}

function filterComponents(
  components: readonly VelyxComponentMeta[],
  query?: string,
): VelyxComponentMeta[] {
  if (!query) {
    return [...components]
  }

  const normalized = query.toLowerCase()
  return components.filter((component) => {
    const nameMatch = component.name.toLowerCase().includes(normalized)
    const descriptionMatch = component.description
      ? component.description.toLowerCase().includes(normalized)
      : false
    const categoryMatch = component.categories
      ? component.categories.some((category) =>
        category.toLowerCase().includes(normalized),
      )
      : false

    return nameMatch || descriptionMatch || categoryMatch
  })
}

function sliceComponents(
  components: VelyxComponentMeta[],
  offset?: number,
  limit?: number,
): VelyxComponentMeta[] {
  const start = Math.max(0, offset ?? 0)
  if (limit === undefined) {
    return components.slice(start)
  }
  return components.slice(start, start + Math.max(0, limit))
}

export async function listComponents(options: ListOptions): Promise<void> {
  const registryService = new RegistryService()
  const registry = await registryService.fetchRegistry()

  const sorted = [...registry.components].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const filtered = filterComponents(sorted, options.query)
  const sliced = sliceComponents(filtered, options.offset, options.limit)

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          total: filtered.length,
          count: sliced.length,
          offset: options.offset ?? 0,
          limit: options.limit ?? null,
          components: sliced,
        },
        null,
        2,
      ),
    )
    return
  }

  if (sliced.length === 0) {
    logger.warn('No components found.')
    return
  }

  console.log(chalk.bold('\nAvailable components:'))
  console.log('')

  const table = new Table({
    head: [
      chalk.bold('Component'),
      chalk.bold('Description'),
      chalk.bold('Categories'),
    ],
    colWidths: [24, 50, 24],
    wordWrap: true,
    style: {
      head: [],
      border: [],
    },
  })

  for (const component of sliced) {
    table.push([
      chalk.cyan(component.name),
      chalk.white(component.description || 'No description'),
      chalk.gray(component.categories?.join(', ') || '-'),
    ])
  }

  console.log(table.toString())
  console.log('')
  logger.info(`Run ${chalk.green('velyx add <component>')} to add one.`)
}
