import { inspectAll, parseSpellbook } from '@spellcraft/core';
import { readYaml } from '../io.js';
import { logger } from '../logger.js';

export const inspectCommand = async (configPath: string): Promise<void> => {
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

	const diagnostics = inspectAll(bookResult.value);

	if (diagnostics.length === 0) {
		logger.success('No issues found');
		return;
	}

	const errors = diagnostics.filter((d) => d.severity === 'error');
	const warns = diagnostics.filter((d) => d.severity === 'warn');
	const infos = diagnostics.filter((d) => d.severity === 'info');

	for (const d of diagnostics) {
		const prefix = d.spellId ? `[${d.spellId}] ` : '';
		switch (d.severity) {
			case 'error':
				logger.error(`${prefix}${d.code}: ${d.message}`);
				break;
			case 'warn':
				logger.warn(`${prefix}${d.code}: ${d.message}`);
				break;
			case 'info':
				logger.info(`${prefix}${d.code}: ${d.message}`);
				break;
		}
	}

	logger.inspect(
		`${errors.length} errors, ${warns.length} warnings, ${infos.length} info`,
	);

	if (errors.length > 0) {
		process.exitCode = 1;
	}
};
