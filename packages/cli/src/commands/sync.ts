import { resolve } from 'node:path';
import { pipe } from 'remeda';
import { match } from 'ts-pattern';
import { type FormatFn, castAll, detectDrift, parseSpellbook } from '@spellcraft/core';
import type { CastFile, Target } from '@spellcraft/core';
import { getGenerator } from '@spellcraft/generators';
import { readFileContent, readYaml, writeOutput } from '../io.js';
import { logger } from '../logger.js';

interface SyncOptions {
	readonly check: boolean;
	readonly apply: boolean;
}

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

	const result = pipe(
		rawResult.value,
		parseSpellbook,
		(r) => r.andThen((book) => castAll(book, buildFormatters(book.targets))),
	);

	if (result.isErr()) {
		logger.error(`Error: ${result.error._tag}`);
		process.exitCode = 1;
		return;
	}

	const outputs = result.value;
	const baseDir = resolve(configPath, '..');
	let hasDrift = false;

	for (const output of outputs) {
		for (const file of output.files) {
			const fullPath = resolve(baseDir, file.filePath);
			const actualResult = await readFileContent(fullPath);

			if (actualResult.isErr()) {
				logger.warn(`${file.filePath}: file not found (will be created on cast)`);
				hasDrift = true;
				continue;
			}

			const drift = detectDrift(file, actualResult.value);

			match(drift)
				.with({ _tag: 'InSync' }, () => logger.sync(`${file.filePath}: in sync`))
				.with({ _tag: 'Drifted' }, (d) => {
					hasDrift = true;
					logger.warn(`${file.filePath}: drifted (${d.changes.length} changes)`);
					d.changes.forEach((change) => logger.info(`  ${change.type}: ${change.detail}`));
				})
				.exhaustive();
		}
	}

	match({ hasDrift, apply: options.apply, check: options.check })
		.when(
			({ hasDrift, apply }) => hasDrift && apply,
			async () => {
				for (const output of outputs) {
					for (const file of output.files) {
						await writeOutput(resolve(baseDir, file.filePath), file.content);
						logger.sync(`${file.filePath}: synced`);
					}
				}
				logger.success('Sync applied');
			},
		)
		.when(
			({ hasDrift, check }) => hasDrift && check,
			() => {
				logger.error('Drift detected. Run with --apply to fix.');
				process.exitCode = 1;
			},
		)
		.when(
			({ hasDrift }) => !hasDrift,
			() => logger.success('All files in sync'),
		)
		.otherwise(() => {});
};
