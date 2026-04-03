import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';
import { formatMarkdown } from './format-markdown.js';

export const clineGenerator: Generator = {
	target: 'cline',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: '.clinerules',
			content: formatMarkdown(project, spells),
		},
	],
};
