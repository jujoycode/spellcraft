import type { ProjectMeta, Spell } from '@spellcraft/core';
import type { Generator, GeneratorOutput } from './types.js';

const formatMdc = (spell: Spell): string => {
	const globs = spell.globs.length > 0 ? spell.globs.join(', ') : '';

	const frontmatter = [
		'---',
		`description: ${spell.description}`,
		`globs: ${globs}`,
		`alwaysApply: ${spell.alwaysApply}`,
		'---',
	].join('\n');

	return `${frontmatter}\n\n${spell.content}`;
};

export const cursorGenerator: Generator = {
	target: 'cursor',
	generate: (_project: ProjectMeta, spells: readonly Spell[]): readonly GeneratorOutput[] =>
		spells.map((spell) => ({
			filePath: `.cursor/rules/${spell.id}.mdc`,
			content: formatMdc(spell),
		})),
};
