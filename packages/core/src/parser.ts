import { type Result, err, ok } from 'neverthrow';
import * as v from 'valibot';
import { SpellbookSchema } from './schema.js';
import type { Spell, SpellId, Spellbook, SpellcraftError } from './types.js';

const toSpell = (raw: {
	readonly id: string;
	readonly description: string;
	readonly content: string;
	readonly targets: readonly string[];
	readonly globs: readonly string[];
	readonly alwaysApply: boolean;
}): Spell => ({
	id: raw.id as SpellId,
	description: raw.description,
	content: raw.content,
	targets: raw.targets as Spell['targets'],
	globs: raw.globs,
	alwaysApply: raw.alwaysApply,
});

const toSpellbook = (raw: v.InferOutput<typeof SpellbookSchema>): Spellbook => ({
	version: raw.version,
	project: raw.project,
	targets: raw.targets as Spellbook['targets'],
	tomes: raw.tomes,
	spells: raw.spells.map(toSpell),
	overrides: Object.fromEntries(
		Object.entries(raw.overrides).map(([key, val]) => [
			key,
			{
				...val,
				...(val.targets ? { targets: val.targets as Spell['targets'] } : {}),
			},
		]),
	),
	...(raw.extends ? { extends: raw.extends } : {}),
});

export const parseSpellbook = (raw: unknown): Result<Spellbook, SpellcraftError> => {
	const parsed = v.safeParse(SpellbookSchema, raw);

	if (!parsed.success) {
		return err({
			_tag: 'SchemaError',
			violations: parsed.issues.map((i) => i.message),
		});
	}

	return ok(toSpellbook(parsed.output));
};
