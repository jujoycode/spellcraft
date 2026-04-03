import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';
import { formatMarkdown } from './format-markdown.js';

export const copilotGenerator: Generator = {
	target: 'copilot',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: '.github/copilot-instructions.md',
			content: formatMarkdown(project, spells),
		},
	],
};
