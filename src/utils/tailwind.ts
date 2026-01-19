import fs from 'fs';

export function readPackageJson(): any | null {
  try {
    return JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch {
    return null;
  }
}

export function detectTailwindV4(pkg: any): boolean {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['@tailwindcss/vite'] || deps['@tailwindcss/postcss']) {
    return true;
  }
  if (deps['tailwindcss']) {
    const version = String(deps['tailwindcss']);
    const match = version.match(/(\d+)/);
    return match ? Number(match[1]) >= 4 : false;
  }
  return false;
}
