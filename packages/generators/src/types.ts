import type { ProjectMeta, Spell, Target } from '@spellcraft/core';

export interface GeneratorOutput {
	readonly filePath: string;
	readonly content: string;
}

export interface Generator {
	readonly target: Target;
	readonly generate: (
		project: ProjectMeta,
		spells: readonly Spell[],
	) => readonly GeneratorOutput[];
}
