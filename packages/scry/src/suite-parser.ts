import { type Result, err, ok } from 'neverthrow';
import type { SpellcraftError } from '@spellcraft/core';
import * as v from 'valibot';
import { ScrySuiteSchema } from './schema.js';
import type { ScrySuite } from './types.js';

export const parseScrySuite = (raw: unknown): Result<ScrySuite, SpellcraftError> => {
	const parsed = v.safeParse(ScrySuiteSchema, raw);

	if (!parsed.success) {
		return err({
			_tag: 'SchemaError',
			violations: parsed.issues.map((i) => i.message),
		});
	}

	return ok(parsed.output as ScrySuite);
};
