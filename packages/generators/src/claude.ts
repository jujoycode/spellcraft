import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';

const formatMarkdown = (project: ProjectMeta, spells: readonly Spell[]): string => {
	const header = project.description
		? `# Project: ${project.name}\n\n${project.description}`
		: `# Project: ${project.name}`;

	const sections = spells.map((spell) => `## ${spell.description}\n\n${spell.content}`);

	return [header, '', ...sections].join('\n');
};

export const claudeGenerator: Generator = {
	target: 'claude',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: 'CLAUDE.md',
			content: formatMarkdown(project, spells),
		},
	],
};
