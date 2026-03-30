import { resolve } from 'node:path';
import { type FormatFn, castAll, detectDrift, parseSpellbook } from '@spellcraft/core';
import type { Target } from '@spellcraft/core';
import { getGenerator } from '@spellcraft/generators';
import { readFileContent, readYaml, writeOutput } from '../io.js';
import { logger } from '../logger.js';

interface SyncOptions {
	readonly check: boolean;
	readonly apply: boolean;
}

export const syncCommand = async (
	configPath: string,
	options: SyncOptions,
): Promise<void> => {
	const rawResult = await readYaml(configPath);
	if (rawResult.isErr()) {
		logger.error(`Failed to read ${configPath}: ${String(rawResult.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const bookResult = parseSpellbook(rawResult.value);
	if (bookResult.isErr()) {
		logger.error('Failed to parse spellbook');
		process.exitCode = 1;
		return;
	}

	const book = bookResult.value;
	const baseDir = resolve(configPath, '..');

	const formatters = new Map<Target, FormatFn>();
	for (const target of book.targets) {
		const gen = getGenerator(target);
		if (gen) {
			formatters.set(target, (project, spells, _target) => {
				const outputs = gen.generate(project, spells);
				const content = outputs.map((o) => o.content).join('\n');
				const filePath = outputs[0]?.filePath ?? '';
				return { filePath, content };
			});
		}
	}

	const expected = castAll(book, formatters);
	let hasDrift = false;

	for (const output of expected) {
		const fullPath = resolve(baseDir, output.filePath);
		const actualResult = await readFileContent(fullPath);

		if (actualResult.isErr()) {
			logger.warn(`${output.filePath}: file not found (will be created on cast)`);
			hasDrift = true;
			continue;
		}

		const drift = detectDrift(output, actualResult.value);

		if (drift._tag === 'InSync') {
			logger.sync(`${output.filePath}: in sync`);
		} else {
			hasDrift = true;
			logger.warn(`${output.filePath}: drifted (${drift.changes.length} changes)`);
			for (const change of drift.changes) {
				logger.info(`  ${change.type}: ${change.detail}`);
			}
		}
	}

	if (hasDrift && options.apply) {
		for (const output of expected) {
			const fullPath = resolve(baseDir, output.filePath);
			await writeOutput(fullPath, output.content);
			logger.sync(`${output.filePath}: synced`);
		}
		logger.success('Sync applied');
	} else if (hasDrift && options.check) {
		logger.error('Drift detected. Run with --apply to fix.');
		process.exitCode = 1;
	} else if (!hasDrift) {
		logger.success('All files in sync');
	}
};
