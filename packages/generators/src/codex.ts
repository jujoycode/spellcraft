import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';
import { formatMarkdown } from './format-markdown.js';

export const codexGenerator: Generator = {
	target: 'codex',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: 'AGENTS.md',
			content: formatMarkdown(project, spells),
		},
	],
};
