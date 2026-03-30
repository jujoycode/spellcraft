import { type Result, ok } from 'neverthrow';
import type { Spell, Spellbook, SpellcraftError } from './types.js';

/** Merge base spells with override spells. Later spells win on id collision. */
export const mergeSpells = (
	base: readonly Spell[],
	overrides: readonly Spell[],
): readonly Spell[] => {
	const overrideMap = new Map(overrides.map((s) => [s.id, s]));
	const merged = base.map((spell) =>
		overrideMap.has(spell.id) ? { ...spell, ...overrideMap.get(spell.id)! } : spell,
	);
	const newSpells = overrides.filter((s) => !base.some((b) => b.id === s.id));
	return [...merged, ...newSpells];
};

/** Apply partial overrides to spells by id */
export const applyOverrides = (
	spells: readonly Spell[],
	overrides: Readonly<Record<string, Partial<Spell>>>,
): readonly Spell[] =>
	spells.map((spell) => {
		const override = overrides[spell.id];
		return override ? { ...spell, ...override, id: spell.id } : spell;
	});

/** Merge targets arrays, deduplicating */
const unionTargets = (
	a: readonly Spellbook['targets'][number][],
	b: readonly Spellbook['targets'][number][],
): Spellbook['targets'] => [...new Set([...a, ...b])] as unknown as Spellbook['targets'];

/** Merge two spellbooks. Child overrides parent. */
export const mergeSpellbooks = (
	parent: Spellbook,
	child: Spellbook,
): Result<Spellbook, SpellcraftError> =>
	ok({
		version: child.version,
		project: { ...parent.project, ...child.project },
		targets: unionTargets(parent.targets, child.targets),
		tomes: [...new Set([...parent.tomes, ...child.tomes])],
		spells: applyOverrides(mergeSpells(parent.spells, child.spells), child.overrides),
		overrides: { ...parent.overrides, ...child.overrides },
		...(child.extends ? { extends: child.extends } : {}),
	});
