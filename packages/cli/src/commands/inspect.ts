import { pipe } from 'remeda';
import { match } from 'ts-pattern';
import { inspectAll, parseSpellbook } from '@spellcraft/core';
import type { Diagnostic } from '@spellcraft/core';
import { readYaml } from '../io.js';
import { logger } from '../logger.js';

const logDiagnostic = (d: Diagnostic): void => {
	const prefix = d.spellId ? `[${d.spellId}] ` : '';
	match(d.severity)
		.with('error', () => logger.error(`${prefix}${d.code}: ${d.message}`))
		.with('warn', () => logger.warn(`${prefix}${d.code}: ${d.message}`))
		.with('info', () => logger.info(`${prefix}${d.code}: ${d.message}`))
		.exhaustive();
};

export const inspectCommand = async (configPath: string): Promise<void> => {
	const rawResult = await readYaml(configPath);
	if (rawResult.isErr()) {
		logger.error(`Failed to read ${configPath}: ${String(rawResult.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const result = pipe(
		rawResult.value,
		parseSpellbook,
		(r) => r.map(inspectAll),
	);

	result.match(
		(diagnostics) => {
			if (diagnostics.length === 0) {
				logger.success('No issues found');
				return;
			}

			diagnostics.forEach(logDiagnostic);

			const errors = diagnostics.filter((d) => d.severity === 'error').length;
			const warns = diagnostics.filter((d) => d.severity === 'warn').length;
			const infos = diagnostics.filter((d) => d.severity === 'info').length;

			logger.inspect(`${errors} errors, ${warns} warnings, ${infos} info`);

			if (errors > 0) {
				process.exitCode = 1;
			}
		},
		(error) =>
			match(error)
				.with({ _tag: 'SchemaError' }, (e) => {
					logger.error(`Schema errors:\n${e.violations.join('\n')}`);
					process.exitCode = 1;
				})
				.otherwise((e) => {
					logger.error(`Error: ${e._tag}`);
					process.exitCode = 1;
				}),
	);
};
