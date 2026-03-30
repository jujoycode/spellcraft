import type { CastOutput, Spell, SpellId, Spellbook, Target } from './types.js';
import { estimateTokens } from './tokens.js';

/** Filter spells applicable to a target. A spell applies if it explicitly targets or has no targets (global). */
export const filterSpellsForTarget = (
	spells: readonly Spell[],
	target: Target,
): readonly Spell[] =>
	spells.filter((s) => s.targets.length === 0 || s.targets.includes(target));

/** Format function type — injected by generators package */
export type FormatFn = (
	project: Spellbook['project'],
	spells: readonly Spell[],
	target: Target,
) => { readonly filePath: string; readonly content: string };

/** Cast spells for a single target */
export const castForTarget = (
	book: Spellbook,
	target: Target,
	format: FormatFn,
): CastOutput => {
	const applicable = filterSpellsForTarget(book.spells, target);
	const { filePath, content } = format(book.project, applicable, target);
	return {
		target,
		filePath,
		content,
		tokenCount: estimateTokens(content),
		spellsCast: applicable.map((s) => s.id),
	};
};

/** Cast spells for all targets in the spellbook */
export const castAll = (
	book: Spellbook,
	formatters: ReadonlyMap<Target, FormatFn>,
): readonly CastOutput[] =>
	book.targets.map((target) => {
		const format = formatters.get(target);
		if (!format) {
			return {
				target,
				filePath: '',
				content: '',
				tokenCount: 0,
				spellsCast: [] as readonly SpellId[],
			};
		}
		return castForTarget(book, target, format);
	});
