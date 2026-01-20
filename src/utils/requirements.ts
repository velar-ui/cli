import fs from 'fs';
import type { VelarComponentMeta } from '../types/meta.js';

export function hasAlpineInProject(): boolean {
    // 1. npm/yarn
    if (fs.existsSync('package.json')) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['alpinejs']) return true;
    }
    // 2. Livewire (composer)
    if (fs.existsSync('composer.json')) {
        const composer = JSON.parse(fs.readFileSync('composer.json', 'utf8'));
        const require = { ...composer.require, ...composer['require-dev'] };
        if (require['livewire/livewire']) return true;
    }

    return false;
}

export interface ProjectEnv {
    hasAlpine: boolean;
}

export function checkRequirements(meta: VelarComponentMeta, project: ProjectEnv) {
    if (meta.requires) {
        if (meta.requires.alpine && !project.hasAlpine) {
            throw new Error('This component requires Alpine.js.');
        }
        // Add more requirements here as needed
    }
}
