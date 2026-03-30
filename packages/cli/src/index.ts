import { Command } from 'commander';
import { castCommand } from './commands/cast.js';
import { inspectCommand } from './commands/inspect.js';
import { syncCommand } from './commands/sync.js';
import { scryCommand } from './commands/scry.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
	.name('spellcraft')
	.description('AI agent context file manager — Single Source of Truth')
	.version('0.1.0');

program
	.command('cast')
	.description('Cast spells: generate agent context files from spell.yml')
	.argument('[config]', 'path to spell.yml', 'spell.yml')
	.action(castCommand);

program
	.command('inspect')
	.description('Inspect spells: lint and validate spell.yml')
	.argument('[config]', 'path to spell.yml', 'spell.yml')
	.action(inspectCommand);

program
	.command('sync')
	.description('Sync: detect drift between spell.yml and generated files')
	.argument('[config]', 'path to spell.yml', 'spell.yml')
	.option('--check', 'exit with error if drift is detected', false)
	.option('--apply', 'apply sync to fix drift', false)
	.action(syncCommand);

program
	.command('scry')
	.description('Scry: measure spell effectiveness via eval')
	.requiredOption('--suite <path>', 'path to scry-suite.yaml')
	.action((options: { suite: string }) => scryCommand(options.suite));

program
	.command('init')
	.description('Initialize a new spell.yml in the current directory')
	.argument('[dir]', 'directory to create spell.yml in', '.')
	.action(initCommand);

program.parse();
