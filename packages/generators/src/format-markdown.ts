import type { ProjectMeta, Spell } from '@spellcraft/core';

/** Shared markdown formatter for single-file generators (claude, copilot, windsurf, cline, codex) */
export const formatMarkdown = (project: ProjectMeta, spells: readonly Spell[]): string => {
	const header = project.description
		? `# Project: ${project.name}\n\n${project.description}`
		: `# Project: ${project.name}`;

	const sections = spells.map((spell) => `## ${spell.description}\n\n${spell.content}`);

	return [header, '', ...sections].join('\n');
};
