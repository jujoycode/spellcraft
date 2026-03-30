import { describe, expect, it } from 'vitest';
import { applyOverrides, mergeSpellbooks, mergeSpells } from '../src/merger.js';
import type { Spell, SpellId, Spellbook } from '../src/types.js';

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
	tomes: overrides.tomes ?? [],
	spells: overrides.spells ?? [],
	overrides: overrides.overrides ?? {},
	...('extends' in overrides ? { extends: overrides.extends } : {}),
});

describe('mergeSpells', () => {
	it('같은 id의 주문은 뒤쪽이 우선한다', () => {
		const base = [spell({ id: 'test', content: 'jest 사용' })];
		const child = [spell({ id: 'test', content: 'vitest 사용' })];
		const result = mergeSpells(base, child);
		expect(result).toHaveLength(1);
		expect(result[0]!.content).toBe('vitest 사용');
	});

	it('새로운 주문은 뒤에 추가된다', () => {
		const base = [spell({ id: 'a', content: 'A' })];
		const child = [spell({ id: 'b', content: 'B' })];
		const result = mergeSpells(base, child);
		expect(result).toHaveLength(2);
		expect(result[0]!.id).toBe('a');
		expect(result[1]!.id).toBe('b');
	});

	it('빈 배열끼리 병합하면 빈 배열이다', () => {
		expect(mergeSpells([], [])).toEqual([]);
	});

	it('base만 있으면 base를 그대로 반환한다', () => {
		const base = [spell({ id: 'x' })];
		expect(mergeSpells(base, [])).toEqual(base);
	});
});

describe('applyOverrides', () => {
	it('override에 해당하는 spell의 필드를 변경한다', () => {
		const spells = [spell({ id: 'test', content: '원본' })];
		const result = applyOverrides(spells, { test: { content: '수정됨' } });
		expect(result[0]!.content).toBe('수정됨');
		expect(result[0]!.id).toBe('test');
	});

	it('override에 없는 spell은 변경되지 않는다', () => {
		const spells = [spell({ id: 'a', content: 'A' })];
		const result = applyOverrides(spells, { b: { content: 'B' } });
		expect(result[0]!.content).toBe('A');
	});
});

describe('mergeSpellbooks', () => {
	it('child가 parent를 오버라이드한다', () => {
		const parent = book({
			project: { name: 'parent' },
			targets: ['claude'],
			spells: [spell({ id: 'lang', content: 'TS' })],
		});
		const child = book({
			project: { name: 'child' },
			targets: ['cursor'],
			spells: [spell({ id: 'api', content: 'Hono' })],
		});

		const result = mergeSpellbooks(parent, child);
		expect(result.isOk()).toBe(true);

		const merged = result._unsafeUnwrap();
		expect(merged.project.name).toBe('child');
		expect(merged.targets).toContain('claude');
		expect(merged.targets).toContain('cursor');
		expect(merged.spells).toHaveLength(2);
	});

	it('overrides가 병합된 spells에 적용된다', () => {
		const parent = book({
			spells: [spell({ id: 'test', content: '원본' })],
		});
		const child = book({
			overrides: { test: { content: '오버라이드' } },
		});

		const merged = mergeSpellbooks(parent, child)._unsafeUnwrap();
		expect(merged.spells[0]!.content).toBe('오버라이드');
	});

	it('tomes가 중복 없이 병합된다', () => {
		const parent = book({ tomes: ['a', 'b'] });
		const child = book({ tomes: ['b', 'c'] });

		const merged = mergeSpellbooks(parent, child)._unsafeUnwrap();
		expect(merged.tomes).toEqual(['a', 'b', 'c']);
	});
});
