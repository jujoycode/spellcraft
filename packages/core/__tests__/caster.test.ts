import { describe, expect, it } from 'vitest';
import { type FormatFn, castAll, castForTarget, filterSpellsForTarget } from '../src/caster.js';
import type { Spell, SpellId, Spellbook, Target } from '../src/types.js';

const spell = (overrides: Partial<Spell> & { id: string }): Spell => ({
	id: overrides.id as SpellId,
	description: overrides.description ?? 'desc',
	content: overrides.content ?? 'content',
	targets: overrides.targets ?? [],
	globs: overrides.globs ?? [],
	alwaysApply: overrides.alwaysApply ?? true,
});

const book = (overrides: Partial<Spellbook> = {}): Spellbook => ({
	version: 1,
	project: overrides.project ?? { name: 'test' },
	targets: overrides.targets ?? ['claude'],
	tomes: [],
	spells: overrides.spells ?? [],
	overrides: {},
});

const simpleFormat: FormatFn = (project, spells, _target) => ({
	filePath: 'output.md',
	content: spells.map((s) => s.content).join('\n'),
});

describe('filterSpellsForTarget', () => {
	it('target이 비어있는 spell은 모든 target에 적용된다', () => {
		const spells = [spell({ id: 'global', targets: [] })];
		expect(filterSpellsForTarget(spells, 'claude')).toHaveLength(1);
		expect(filterSpellsForTarget(spells, 'cursor')).toHaveLength(1);
	});

	it('특정 target의 spell만 필터링한다', () => {
		const spells = [
			spell({ id: 'a', targets: ['claude'] }),
			spell({ id: 'b', targets: ['cursor'] }),
			spell({ id: 'c', targets: ['claude', 'cursor'] }),
		];
		const result = filterSpellsForTarget(spells, 'claude');
		expect(result).toHaveLength(2);
		expect(result.map((s) => s.id)).toEqual(['a', 'c']);
	});
});

describe('castForTarget', () => {
	it('출력에는 해당 target의 주문만 포함된다', () => {
		const b = book({
			spells: [
				spell({ id: 'a', content: 'A', targets: ['claude'] }),
				spell({ id: 'b', content: 'B', targets: ['cursor'] }),
			],
		});
		const output = castForTarget(b, 'claude', simpleFormat);
		expect(output.spellsCast).toEqual(['a']);
		expect(output.content).toBe('A');
	});

	it('토큰 수를 포함한다', () => {
		const b = book({ spells: [spell({ id: 'x', content: 'hello world' })] });
		const output = castForTarget(b, 'claude', simpleFormat);
		expect(output.tokenCount).toBeGreaterThan(0);
	});
});

describe('castAll', () => {
	it('모든 target에 대해 CastOutput을 생성한다', () => {
		const b = book({
			targets: ['claude', 'cursor'] as readonly Target[],
			spells: [spell({ id: 'x', content: 'X' })],
		});
		const formatters = new Map<Target, FormatFn>([
			['claude', simpleFormat],
			['cursor', simpleFormat],
		]);
		const outputs = castAll(b, formatters);
		expect(outputs).toHaveLength(2);
		expect(outputs[0]!.target).toBe('claude');
		expect(outputs[1]!.target).toBe('cursor');
	});
});
