import { resolve } from 'node:path';
import { type FormatFn, castAll, parseSpellbook } from '@spellcraft/core';
import type { Target } from '@spellcraft/core';
import { getGenerator } from '@spellcraft/generators';
import { readYaml, writeOutput } from '../io.js';
import { logger } from '../logger.js';

export const castCommand = async (configPath: string): Promise<void> => {
	const rawResult = await readYaml(configPath);
	if (rawResult.isErr()) {
		logger.error(`Failed to read ${configPath}: ${String(rawResult.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const bookResult = parseSpellbook(rawResult.value);
	if (bookResult.isErr()) {
		const e = bookResult.error;
		if (e._tag === 'SchemaError') {
			logger.error(`Schema errors:\n${e.violations.join('\n')}`);
		} else {
			logger.error(e.message);
		}
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

	const outputs = castAll(book, formatters);

	for (const output of outputs) {
		const fullPath = resolve(baseDir, output.filePath);
		const writeResult = await writeOutput(fullPath, output.content);
		if (writeResult.isErr()) {
			logger.error(`Failed to write ${output.filePath}: ${String(writeResult.error.cause)}`);
		} else {
			logger.cast(`${output.target} \u2192 ${output.filePath} (${output.tokenCount} tokens, ${output.spellsCast.length} spells)`);
		}
	}

	logger.success(`Cast complete: ${outputs.length} targets`);
};
