import fs from 'fs';

export const CSS_CANDIDATES = [
  'resources/css/app.css',
  'resources/css/app.scss',
  'resources/css/main.css',
  'resources/css/style.css',
  'resources/css/styles.css',
];

export function findMainCss(): { path: string; content: string } | null {
  for (const rel of CSS_CANDIDATES) {
    if (fs.existsSync(rel)) {
      return {
        path: rel,
        content: fs.readFileSync(rel, 'utf8'),
      };
    }
  }
  return null;
}

export function hasTailwindImport(css: string): boolean {
  return /@import\s+["']tailwindcss["']/.test(css);
}

export function ensureDir(p: string): void {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

export function injectVelarImport(cssPath: string): void {
  let content = fs.readFileSync(cssPath, 'utf8');
  if (content.includes('@import "./velar.css"')) {
    return;
  }
  if (hasTailwindImport(content)) {
    content = content.replace(
      /@import\s+["']tailwindcss["'];?/,
      match => `${match}\n@import \"./velar.css\";`
    );
  } else {
    content += '\n@import "./velar.css";\n';
  }
  fs.writeFileSync(cssPath, content, 'utf8');
}
