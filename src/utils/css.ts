import fs from 'fs'
import type { FileInfo } from '@/src/types'

/**
 * Common CSS file paths to check for main stylesheet
 */
export const CSS_CANDIDATES = [
  'resources/css/app.css',
  'resources/css/app.scss',
  'resources/css/main.css',
  'resources/css/style.css',
  'resources/css/styles.css',
] as const

/**
 * Find the main CSS file in the project
 * @returns CSS file info if found, null otherwise
 */
export function findMainCss(): FileInfo | null {
  for (const rel of CSS_CANDIDATES) {
    if (fs.existsSync(rel)) {
      return {
        path: rel,
        content: fs.readFileSync(rel, 'utf8'),
      }
    }
  }
  return null
}

/**
 * Check if CSS content has Tailwind import
 * @param css - CSS content to check
 * @returns True if Tailwind import is found
 */
export function hasTailwindImport(css: string): boolean {
  return /@import\s+["']tailwindcss["']/.test(css)
}

/**
 * Inject Velyx CSS import into main CSS file
 * @param cssPath - Path to the CSS file
 * @throws Error if file read/write fails
 */
export function injectVelyxImport(cssPath: string): void {
  let content = fs.readFileSync(cssPath, 'utf8')
  if (content.includes('@import "./velyx.css"')) {
    return
  }
  if (hasTailwindImport(content)) {
    content = content.replace(
      /@import\s+["']tailwindcss["'];?/,
      (match) => `${match}\n@import "./velyx.css";`,
    )
  } else {
    content += '\n@import "./velyx.css";\n'
  }
  fs.writeFileSync(cssPath, content, 'utf8')
}
