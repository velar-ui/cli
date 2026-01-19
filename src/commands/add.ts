import { Command } from 'commander';

export default function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a UI component to your Laravel project')
    .action(async (component: string) => {
      console.log(`Not implemented yet: add ${component}`);
    });
}
