import { describe, expect, it } from 'vitest';
import {
	checkConflicts,
	checkMissingGlobs,
	checkTokenBudget,
	checkVagueness,
	inspectAll,
} from '../src/inspector.js';
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
	project: { name: 'test' },
	targets: overrides.targets ?? ['claude'],
	tomes: [],
	spells: overrides.spells ?? [],
	overrides: {},
});

describe('checkVagueness', () => {
	it('모호한 표현을 감지한다', () => {
		const b = book({
			spells: [spell({ id: 'a', content: '좋은 코드를 작성하세요' })],
		});
		const diags = checkVagueness(b);
		expect(diags).toHaveLength(1);
		expect(diags[0]!.code).toBe('VAGUE');
	});

	it('영어 모호 표현도 감지한다', () => {
		const b = book({
			spells: [spell({ id: 'a', content: 'Follow best practices for testing' })],
		});
		const diags = checkVagueness(b);
		expect(diags.length).toBeGreaterThan(0);
	});

	it('구체적인 표현에는 경고하지 않는다', () => {
		const b = book({
			spells: [spell({ id: 'a', content: 'vitest를 사용한다. 커버리지 80% 이상.' })],
		});
		const diags = checkVagueness(b);
		expect(diags).toHaveLength(0);
	});
});

describe('checkTokenBudget', () => {
	it('토큰 초과 시 경고를 반환한다', () => {
		const longContent = 'word '.repeat(7000);
		const b = book({
			spells: [spell({ id: 'big', content: longContent })],
		});
		const diags = checkTokenBudget(b);
		expect(diags).toHaveLength(1);
		expect(diags[0]!.code).toBe('TOKEN_OVER');
	});

	it('토큰 이내면 경고하지 않는다', () => {
		const b = book({
			spells: [spell({ id: 'small', content: '짧은 내용' })],
		});
		const diags = checkTokenBudget(b);
		expect(diags).toHaveLength(0);
	});
});

describe('checkMissingGlobs', () => {
	it('alwaysApply=false이고 globs가 없으면 info를 반환한다', () => {
		const b = book({
			spells: [spell({ id: 'a', alwaysApply: false, globs: [] })],
		});
		const diags = checkMissingGlobs(b);
		expect(diags).toHaveLength(1);
		expect(diags[0]!.code).toBe('MISSING_GLOBS');
	});

	it('alwaysApply=true이면 globs가 없어도 괜찮다', () => {
		const b = book({
			spells: [spell({ id: 'a', alwaysApply: true, globs: [] })],
		});
		expect(checkMissingGlobs(b)).toHaveLength(0);
	});
});

describe('inspectAll', () => {
	it('모든 규칙을 실행한다', () => {
		const b = book({
			spells: [
				spell({ id: 'a', content: '좋은 코드 작성', alwaysApply: false, globs: [] }),
			],
		});
		const diags = inspectAll(b);
		expect(diags.length).toBeGreaterThan(0);
	});
});
