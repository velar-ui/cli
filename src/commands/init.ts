import { Command } from 'commander';

export default function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize Velar in a Laravel project')
    .action(async () => {
      console.log('Not implemented yet.');
    });
}
