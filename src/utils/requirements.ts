import fs from 'fs'
import path from 'path'

/**
 * Check if Alpine.js is listed in package.json dependencies
 * @returns True if Alpine.js is found in dependencies
 */
export function hasAlpineInPackageJson(): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
      dependencies?: Readonly<Record<string, string>>
      devDependencies?: Readonly<Record<string, string>>
    }
    const hasInDeps =
      pkg.dependencies &&
      Object.keys(pkg.dependencies).some((dep) =>
        dep.toLowerCase().includes('alpine'),
      )
    const hasInDevDeps =
      pkg.devDependencies &&
      Object.keys(pkg.devDependencies).some((dep) =>
        dep.toLowerCase().includes('alpine'),
      )
    return Boolean(hasInDeps || hasInDevDeps)
  } catch {
    return false
  }
}

/**
 * Check if Alpine.js is referenced in layout files
 * @returns True if Alpine.js is found in layout files
 */
export function hasAlpineInLayouts(): boolean {
  const layoutDir = 'resources/views/layouts'
  if (!fs.existsSync(layoutDir)) return false

  try {
    const files = fs.readdirSync(layoutDir, { recursive: true }) as string[]
    for (const file of files) {
      if (file.endsWith('.blade.php')) {
        const content = fs.readFileSync(path.join(layoutDir, file), 'utf8')
        if (content.toLowerCase().includes('alpine')) {
          return true
        }
      }
    }
  } catch {
    return false
  }
  return false
}

/**
 * Check if Alpine.js is available in the project
 * @returns True if Alpine.js is detected
 */
export function hasAlpineJs(): boolean {
  return hasAlpineInPackageJson() || hasAlpineInLayouts()
}
