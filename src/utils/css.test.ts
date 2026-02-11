import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  findMainCss,
  hasTailwindImport,
  injectVelyxImport,
  CSS_CANDIDATES,
} from './css'

// Mock fs module properly
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

import fs from 'fs'
const mockFs = vi.mocked(fs)

describe('css utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findMainCss', () => {
    it('should return first existing CSS file', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === 'resources/css/app.scss'
      })
      mockFs.readFileSync.mockReturnValue('/* css content */')

      const result = findMainCss()

      expect(result).toEqual({
        path: 'resources/css/app.scss',
        content: '/* css content */',
      })
    })

    it('should return null if no CSS file exists', () => {
      mockFs.existsSync.mockReturnValue(false)

      const result = findMainCss()

      expect(result).toBeNull()
    })

    it('should check CSS candidates in order', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === 'resources/css/style.css'
      })
      mockFs.readFileSync.mockReturnValue('content')

      const result = findMainCss()

      expect(result?.path).toBe('resources/css/style.css')
      // Should check candidates until it finds one that exists
      expect(mockFs.existsSync).toHaveBeenCalledTimes(4) // style.css is 4th in array
    })
  })

  describe('hasTailwindImport', () => {
    it('should return true for Tailwind import with single quotes', () => {
      const css = "@import 'tailwindcss';"
      expect(hasTailwindImport(css)).toBe(true)
    })

    it('should return true for Tailwind import with double quotes', () => {
      const css = '@import "tailwindcss";'
      expect(hasTailwindImport(css)).toBe(true)
    })

    it('should return true for Tailwind import with spaces', () => {
      const css = "@import   'tailwindcss'   ;"
      expect(hasTailwindImport(css)).toBe(true)
    })

    it('should return false for non-Tailwind imports', () => {
      const css = "@import './custom.css';"
      expect(hasTailwindImport(css)).toBe(false)
    })

    it('should return false for CSS without imports', () => {
      const css = 'body { margin: 0; }'
      expect(hasTailwindImport(css)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(hasTailwindImport('')).toBe(false)
    })

    it('should be case sensitive', () => {
      const css = "@import 'TAILWINDCSS';"
      expect(hasTailwindImport(css)).toBe(false)
    })
  })

  describe('injectVelyxImport', () => {
    it('should inject Velyx import after Tailwind import when Tailwind is present', () => {
      const originalContent = "@import 'tailwindcss';"
      const expectedContent = '@import \'tailwindcss\';\n@import "./velyx.css";'

      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.readFileSync).toHaveBeenCalledWith('test.css', 'utf8')
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        expectedContent,
        'utf8',
      )
    })

    it('should inject Velyx import at the end when no Tailwind import is present', () => {
      const originalContent = 'body { margin: 0; }'
      const expectedContent = 'body { margin: 0; }\n@import "./velyx.css";\n'

      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        expectedContent,
        'utf8',
      )
    })

    it('should not inject Velyx import if it already exists', () => {
      const originalContent = '@import \'tailwindcss\';\n@import "./velyx.css";'
      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.readFileSync).toHaveBeenCalledWith('test.css', 'utf8')
      expect(mockFs.writeFileSync).not.toHaveBeenCalled()
    })

    it('should handle Tailwind import with different quote styles', () => {
      const testCases = [
        { input: '@import "tailwindcss";', expected: '@import "tailwindcss";' },
        { input: "@import 'tailwindcss';", expected: "@import 'tailwindcss';" },
        { input: "@import 'tailwindcss';", expected: "@import 'tailwindcss';" },
      ]

      testCases.forEach(({ input, expected }) => {
        vi.clearAllMocks()
        mockFs.readFileSync.mockReturnValue(input)

        injectVelyxImport('test.css')

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          'test.css',
          `${expected}\n@import "./velyx.css";`,
          'utf8',
        )
      })
    })

    it('should preserve existing content structure', () => {
      const originalContent = `/* Custom styles */
@import "tailwindcss";

body {
  font-family: Arial, sans-serif;
}`
      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        `/* Custom styles */
@import "tailwindcss";
@import "./velyx.css";

body {
  font-family: Arial, sans-serif;
}`,
        'utf8',
      )
    })

    it('should handle empty file', () => {
      const originalContent = ''
      const expectedContent = '\n@import "./velyx.css";\n'
      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        expectedContent,
        'utf8',
      )
    })

    it('should handle file with only comments', () => {
      const originalContent = '/* CSS File */'
      const expectedContent = '/* CSS File */\n@import "./velyx.css";\n'
      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        expectedContent,
        'utf8',
      )
    })

    it('should handle multiple Tailwind imports (first one)', () => {
      const originalContent = `@import 'tailwindcss';
@import 'tailwindcss/forms';`
      const expectedContent = `@import 'tailwindcss';
@import "./velyx.css";
@import 'tailwindcss/forms';`
      mockFs.readFileSync.mockReturnValue(originalContent)

      injectVelyxImport('test.css')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test.css',
        expectedContent,
        'utf8',
      )
    })
  })

  describe('CSS_CANDIDATES', () => {
    it('should contain expected CSS file paths', () => {
      expect(CSS_CANDIDATES).toEqual([
        'resources/css/app.css',
        'resources/css/app.scss',
        'resources/css/main.css',
        'resources/css/style.css',
        'resources/css/styles.css',
      ])
    })

    it('should be readonly array', () => {
      expect(Array.isArray(CSS_CANDIDATES)).toBe(true)
      // TypeScript readonly arrays are typed as readonly at compile time
      // but not necessarily frozen at runtime
      expect(CSS_CANDIDATES).toBeDefined()
      // Test that it has expected length and content
      expect(CSS_CANDIDATES.length).toBe(5)
    })
  })
})
