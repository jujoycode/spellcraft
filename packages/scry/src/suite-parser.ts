import { type Result, err, ok } from 'neverthrow';
import type { SpellcraftError } from '@spellcraft/core';
import * as v from 'valibot';
import { ScrySuiteSchema } from './schema.js';
import type { ScrySuite } from './types.js';

type RawScrySuite = v.InferOutput<typeof ScrySuiteSchema>;

/** Converts valibot output to our readonly ScrySuite type */
const toScrySuite = (raw: RawScrySuite): ScrySuite => ({
	version: raw.version,
	suite: raw.suite,
	spellbook: raw.spellbook,
	provider: raw.provider,
	tasks: raw.tasks,
	report: raw.report,
});

export const parseScrySuite = (raw: unknown): Result<ScrySuite, SpellcraftError> => {
	const parsed = v.safeParse(ScrySuiteSchema, raw);

	if (!parsed.success) {
		return err({
			_tag: 'SchemaError',
			violations: parsed.issues.map((i) => i.message),
		});
	}

	return ok(toScrySuite(parsed.output));
};
