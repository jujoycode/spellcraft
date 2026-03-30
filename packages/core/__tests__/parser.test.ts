import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseSpellbook } from '../src/parser.js';

const loadFixture = (name: string): unknown => {
	const content = readFileSync(resolve(__dirname, `fixtures/${name}`), 'utf-8');
	return parse(content);
};

describe('parseSpellbook', () => {
	it('유효한 YAML을 Spellbook으로 파싱한다', () => {
		const raw = loadFixture('valid-spellbook.yaml');
		const result = parseSpellbook(raw);

		expect(result.isOk()).toBe(true);

		const book = result._unsafeUnwrap();
		expect(book.version).toBe(1);
		expect(book.project.name).toBe('my-saas');
		expect(book.project.description).toBe('B2B SaaS 플랫폼');
		expect(book.targets).toEqual(['claude', 'cursor', 'copilot']);
		expect(book.tomes).toEqual(['@spellcraft/nextjs-app-router']);
		expect(book.spells).toHaveLength(3);
	});

	it('spell의 필드가 올바르게 매핑된다', () => {
		const raw = loadFixture('valid-spellbook.yaml');
		const book = parseSpellbook(raw)._unsafeUnwrap();

		const lang = book.spells[0]!;
		expect(lang.id).toBe('lang');
		expect(lang.description).toBe('언어 및 프레임워크');
		expect(lang.globs).toEqual(['**/*.ts', '**/*.tsx']);
		expect(lang.alwaysApply).toBe(true);
		expect(lang.targets).toEqual([]);

		const db = book.spells[2]!;
		expect(db.targets).toEqual(['claude']);
		expect(db.alwaysApply).toBe(false);
	});

	it('잘못된 YAML은 SchemaError를 반환한다', () => {
		const raw = loadFixture('invalid-spellbook.yaml');
		const result = parseSpellbook(raw);

		expect(result.isErr()).toBe(true);

		const error = result._unsafeUnwrapErr();
		expect(error._tag).toBe('SchemaError');
		if (error._tag === 'SchemaError') {
			expect(error.violations.length).toBeGreaterThan(0);
		}
	});

	it('null 입력은 SchemaError를 반환한다', () => {
		const result = parseSpellbook(null);
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe('SchemaError');
	});

	it('빈 객체는 SchemaError를 반환한다', () => {
		const result = parseSpellbook({});
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe('SchemaError');
	});

	it('targets가 없는 spell은 빈 배열로 기본값 설정된다', () => {
		const raw = loadFixture('valid-spellbook.yaml');
		const book = parseSpellbook(raw)._unsafeUnwrap();
		const lang = book.spells[0]!;
		expect(lang.targets).toEqual([]);
	});

	it('overrides가 없으면 빈 객체로 기본값 설정된다', () => {
		const raw = loadFixture('valid-spellbook.yaml');
		const book = parseSpellbook(raw)._unsafeUnwrap();
		expect(book.overrides).toEqual({});
	});
});
