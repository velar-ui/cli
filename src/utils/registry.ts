
import fs from 'fs';
import path from 'path';
import type { VelarComponentMeta } from '../types/meta.js';

export function readRegistry(registryPath: string) {
  const registryFile = path.join(registryPath, 'registry.json');
  if (!fs.existsSync(registryFile)) {
    throw new Error('Registry not found.');
  }
  return JSON.parse(fs.readFileSync(registryFile, 'utf8'));
}

export function getComponentMeta(registryPath: string, name: string): VelarComponentMeta {
  const metaPath = path.join(registryPath, 'components', name, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Component "${name}" not found.`);
  }
  return JSON.parse(fs.readFileSync(metaPath, 'utf8')) as VelarComponentMeta;
}

export function getComponentFiles(registryPath: string, name: string) {
  const compDir = path.join(registryPath, 'components', name);
  if (!fs.existsSync(compDir)) {
    throw new Error(`Component "${name}" not found.`);
  }
  return fs.readdirSync(compDir).filter(f => f.endsWith('.blade.php'));
}
