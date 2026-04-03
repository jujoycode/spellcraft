import { resolve } from 'node:path';
import { pipe } from 'remeda';
import { match } from 'ts-pattern';
import { type FormatFn, castAll, parseSpellbook } from '@spellcraft/core';
import type { CastFile, Target } from '@spellcraft/core';
import { getGenerator } from '@spellcraft/generators';
import { readYaml, writeOutput } from '../io.js';
import { logger } from '../logger.js';

const buildFormatters = (targets: readonly Target[]): ReadonlyMap<Target, FormatFn> =>
	new Map(
		targets.flatMap((target) => {
			const gen = getGenerator(target);
			return gen
				? [[target, (_project: Parameters<FormatFn>[0], spells: Parameters<FormatFn>[1], _t: Target): readonly CastFile[] =>
						gen.generate(_project, spells).map((o) => ({ filePath: o.filePath, content: o.content })),
					] as [Target, FormatFn]]
				: [];
		}),
	);

export const castCommand = async (configPath: string): Promise<void> => {
	const rawResult = await readYaml(configPath);
	if (rawResult.isErr()) {
		logger.error(`Failed to read ${configPath}: ${String(rawResult.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const result = pipe(
		rawResult.value,
		parseSpellbook,
		(r) => r.andThen((book) => {
			const formatters = buildFormatters(book.targets);
			return castAll(book, formatters);
		}),
	);

	result.match(
		(outputs) => {
			outputs.forEach((output) =>
				output.files.forEach(async (file) => {
					const fullPath = resolve(configPath, '..', file.filePath);
					const writeResult = await writeOutput(fullPath, file.content);
					writeResult.match(
						() => logger.cast(`${output.target} → ${file.filePath} (${output.tokenCount} tokens)`),
						(e) => logger.error(`Failed to write ${file.filePath}: ${String(e.cause)}`),
					);
				}),
			);
			logger.success(`Cast complete: ${outputs.length} targets`);
		},
		(error) =>
			match(error)
				.with({ _tag: 'SchemaError' }, (e) => {
					logger.error(`Schema errors:\n${e.violations.join('\n')}`);
					process.exitCode = 1;
				})
				.with({ _tag: 'ConfigError' }, (e) => {
					logger.error(`Config error: ${e.message}`);
					process.exitCode = 1;
				})
				.otherwise((e) => {
					logger.error(`Error: ${e._tag}`);
					process.exitCode = 1;
				}),
	);
};
