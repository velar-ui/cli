import fs from 'fs'
import type { VelyxConfig } from '../types'

/**
 * Write Velyx configuration to velyx.json file
 * @param config - Configuration object to write
 * @throws Error if file write fails
 */
export function writeVelyxConfig(config: VelyxConfig): void {
  fs.writeFileSync('velyx.json', JSON.stringify(config, null, 2) + '\n', 'utf8')
}

/**
 * Read Velyx configuration from velyx.json file
 * @returns Configuration object
 * @throws Error if file doesn't exist or is invalid
 */
export function readVelyxConfig(): VelyxConfig {
  if (!fs.existsSync('velyx.json')) {
    throw new Error('Velyx configuration not found.')
  }
  return JSON.parse(fs.readFileSync('velyx.json', 'utf8')) as VelyxConfig
}
