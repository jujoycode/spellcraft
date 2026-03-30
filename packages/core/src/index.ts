export type {
	CastOutput,
	Diagnostic,
	DriftChange,
	DriftStatus,
	ProjectMeta,
	Spell,
	SpellId,
	Spellbook,
	SpellcraftError,
	Target,
} from './types.js';

export { parseSpellbook } from './parser.js';
export { estimateTokens } from './tokens.js';
export { SpellbookSchema } from './schema.js';
export { mergeSpells, mergeSpellbooks, applyOverrides } from './merger.js';
export { castForTarget, castAll, filterSpellsForTarget } from './caster.js';
export type { FormatFn } from './caster.js';
export {
	checkVagueness,
	checkConflicts,
	checkTokenBudget,
	checkMissingGlobs,
	inspectAll,
} from './inspector.js';
export { detectDrift } from './differ.js';
