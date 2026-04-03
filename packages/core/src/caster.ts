import { type Result, err, ok } from 'neverthrow';
import type { CastFile, CastOutput, Spell, Spellbook, SpellcraftError, Target } from './types.js';
import { estimateTokens } from './tokens.js';

/** Filter spells applicable to a target. A spell applies if it explicitly targets or has no targets (global). */
export const filterSpellsForTarget = (
	spells: readonly Spell[],
	target: Target,
): readonly Spell[] =>
	spells.filter((s) => s.targets.length === 0 || s.targets.includes(target));

/** Format function type — injected by generators package. Returns multiple files (e.g. cursor). */
export type FormatFn = (
	project: Spellbook['project'],
	spells: readonly Spell[],
	target: Target,
) => readonly CastFile[];

/** Cast spells for a single target */
export const castForTarget = (
	book: Spellbook,
	target: Target,
	format: FormatFn,
): CastOutput => {
	const applicable = filterSpellsForTarget(book.spells, target);
	const files = format(book.project, applicable, target);
	const totalContent = files.map((f) => f.content).join('\n');
	return {
		target,
		files,
		tokenCount: estimateTokens(totalContent),
		spellsCast: applicable.map((s) => s.id),
	};
};

/** Cast spells for all targets in the spellbook. Returns error if a formatter is missing. */
export const castAll = (
	book: Spellbook,
	formatters: ReadonlyMap<Target, FormatFn>,
): Result<readonly CastOutput[], SpellcraftError> => {
	const missingTargets = book.targets.filter((t) => !formatters.has(t));
	if (missingTargets.length > 0) {
		return err({
			_tag: 'ConfigError',
			key: 'formatters',
			message: `Missing formatters for targets: ${missingTargets.join(', ')}`,
		});
	}

	return ok(
		book.targets.map((target) => castForTarget(book, target, formatters.get(target)!)),
	);
};
