import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';
import { formatMarkdown } from './format-markdown.js';

export const claudeGenerator: Generator = {
	target: 'claude',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: 'CLAUDE.md',
			content: formatMarkdown(project, spells),
		},
	],
};
