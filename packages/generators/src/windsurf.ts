import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';
import { formatMarkdown } from './format-markdown.js';

export const windsurfGenerator: Generator = {
	target: 'windsurf',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: '.windsurfrules',
			content: formatMarkdown(project, spells),
		},
	],
};
