import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';

const formatMarkdown = (project: ProjectMeta, spells: readonly Spell[]): string => {
	const header = project.description
		? `# Project: ${project.name}\n\n${project.description}`
		: `# Project: ${project.name}`;

	const sections = spells.map((spell) => `## ${spell.description}\n\n${spell.content}`);

	return [header, '', ...sections].join('\n');
};

export const codexGenerator: Generator = {
	target: 'codex',
	generate: (project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] => [
		{
			filePath: 'AGENTS.md',
			content: formatMarkdown(project, spells),
		},
	],
};
