import { Command } from 'commander';

export default function registerListCommand(program: Command) {
  program
    .command('list')
    .description('List available UI components from the registry')
    .action(async () => {
      console.log('Not implemented yet.');
    });
}
