/** Branded type for spell identifiers */
export type SpellId = string & { readonly _brand: unique symbol };

/** Supported AI agent targets */
export type Target = 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'cline' | 'codex';

export interface ProjectMeta {
	readonly name: string;
	readonly description?: string;
}

export interface Spell {
	readonly id: SpellId;
	readonly description: string;
	readonly content: string;
	readonly targets: readonly Target[];
	readonly globs: readonly string[];
	readonly alwaysApply: boolean;
}

export interface Spellbook {
	readonly version: number;
	readonly project: ProjectMeta;
	readonly targets: readonly Target[];
	readonly tomes: readonly string[];
	readonly spells: readonly Spell[];
	readonly overrides: Readonly<Record<string, Partial<Spell>>>;
	readonly extends?: string;
}

export interface CastOutput {
	readonly target: Target;
	readonly filePath: string;
	readonly content: string;
	readonly tokenCount: number;
	readonly spellsCast: readonly SpellId[];
}

export interface Diagnostic {
	readonly severity: 'error' | 'warn' | 'info';
	readonly spellId: SpellId | null;
	readonly code: string;
	readonly message: string;
}

export type DriftStatus =
	| { readonly _tag: 'InSync' }
	| { readonly _tag: 'Drifted'; readonly changes: readonly DriftChange[] };

export interface DriftChange {
	readonly type: 'added' | 'removed' | 'modified';
	readonly spellId: SpellId | null;
	readonly detail: string;
}

/** Error types — returned as Result, never thrown */
export type SpellcraftError =
	| { readonly _tag: 'ParseError'; readonly path: string; readonly message: string }
	| {
			readonly _tag: 'ConflictError';
			readonly spellA: SpellId;
			readonly spellB: SpellId;
			readonly reason: string;
	  }
	| { readonly _tag: 'FileIOError'; readonly path: string; readonly cause: unknown }
	| { readonly _tag: 'SchemaError'; readonly violations: readonly string[] };
