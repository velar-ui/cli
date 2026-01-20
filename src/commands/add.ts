
import { Command } from 'commander';
import prompts from 'prompts';

import { readVelarConfig } from '../utils/config.js';
import { readRegistry, getComponentMeta, getComponentFiles } from '../utils/registry.js';
import { resolveDependencies } from '../utils/deps.js';
import { checkRequirements, hasAlpineInProject } from '../utils/requirements.js';
import { ensureDir, fileExists, copyFile } from '../utils/filesystem.js';
import path from 'path';
import type { VelarComponentMeta } from '../types/meta.js';

export default function registerAddCommand(program: Command) {

  program
    .command('add [components...]')
    .description('Add one or more UI components to your Laravel project')
    .action(async (components: string[]) => {
      // 1. Check velar.json
      let config;
      try {
        config = readVelarConfig();
      } catch (e) {
        console.error('✖ Velar is not initialized.');
        console.error('→ Run velar init first.');
        process.exit(1);
      }

      // 2. Read config
      const componentsPath = config.components.path;
      const themePath = config.css.velar;
      const theme = config.theme;

      // 3. Load registry
      const registryPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../registry');
      let registry;
      try {
        registry = readRegistry(registryPath);
      } catch (e) {
        console.error('✖ Registry not found.');
        process.exit(1);
      }

      // If no components provided, prompt for selection (multi)
      if (!components || components.length === 0) {
        const available = Object.keys(registry.components);
        const res = await prompts({
          type: 'multiselect',
          name: 'selected',
          message: 'Select components to add',
          choices: available.map(c => ({ title: c, value: c })),
          min: 1
        });
        if (!res.selected || res.selected.length === 0) {
          console.log('✖ No component selected.');
          process.exit(0);
        }
        components = res.selected;
      }

      // Permet add button tabs ...
      for (const component of components) {
        if (!registry.components[component]) {
          console.error(`✖ Component "${component}" not found.`);
          console.error('→ Run velar list to see available components.');
          process.exit(1);
        }
      }

      // Pour chaque composant demandé
      for (const component of components) {
        // 4. Read component meta
        let meta: VelarComponentMeta;
        try {
          meta = getComponentMeta(registryPath, component);
        } catch (e) {
          console.error(`✖ Component "${component}" not found.`);
          process.exit(1);
        }

        // 5. Resolve dependencies (DAG, no cycles)
        let toAdd;
        try {
          toAdd = resolveDependencies(meta, registry);
        } catch (e) {
          console.error((e as Error).message);
          process.exit(1);
        }

        // 6. Validate requirements (Alpine, etc)
        const project = { hasAlpine: hasAlpineInProject() };
        try {
          for (const name of toAdd) {
            const depMeta: VelarComponentMeta = getComponentMeta(registryPath, name);
            if (depMeta.requires && Object.keys(depMeta.requires).length > 0) {
              checkRequirements(depMeta, project);
            }
          }
        } catch (e) {
          console.error(`✖ ${(e as Error).message}`);
          process.exit(1);
        }

        // 7. Determine final path and handle conflicts
        const summary: string[] = [];
        for (const name of toAdd) {
          const depMeta: VelarComponentMeta = getComponentMeta(registryPath, name);
          const bladeFiles = depMeta.files.filter(f => f.type === 'blade');
          for (const file of bladeFiles) {
            const src = path.join(registryPath, 'components', name, file.path);
            const dest = path.join(componentsPath, `${name}.blade.php`);
            if (fileExists(dest)) {
              // Prompt for conflict resolution
              const res = await prompts({
                type: 'select',
                name: 'action',
                message: `⚠ Component "${name}" already exists.\nWhat do you want to do?`,
                choices: [
                  { title: 'Skip', value: 'skip' },
                  { title: 'Overwrite', value: 'overwrite' },
                  { title: 'Cancel', value: 'cancel' },
                ],
                initial: 0,
              });
              if (res.action === 'skip') {
                summary.push(`Skipped ${name}`);
                continue;
              } else if (res.action === 'cancel') {
                console.log('✖ Cancelled.');
                process.exit(0);
              } // else overwrite
            }
            try {
              copyFile(src, dest);
              summary.push(`Added ${name}`);
            } catch (e) {
              summary.push(`Failed to add ${name}`);
            }
          }
        }

        // 10. Print summary for this component
        for (const line of summary) {
          if (line.startsWith('Added')) {
            console.log('✔', line);
          } else if (line.startsWith('Skipped')) {
            console.log('⚠', line);
          } else {
            console.log('✖', line);
          }
        }
      }
      console.log('\nNext steps:');
      console.log('  Use <x-ui.COMPONENT> in your Blade views');
    });
}