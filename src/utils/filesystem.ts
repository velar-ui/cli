import fs from 'fs';
import path from 'path';

export function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function fileExists(p: string) {
  return fs.existsSync(p);
}

export function copyFile(src: string, dest: string) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
}
