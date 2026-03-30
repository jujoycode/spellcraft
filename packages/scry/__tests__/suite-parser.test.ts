import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseScrySuite } from '../src/suite-parser.js';

const loadFixture = (name: string): unknown => {
	const content = readFileSync(resolve(__dirname, `fixtures/${name}`), 'utf-8');
	return parse(content);
};

describe('parseScrySuite', () => {
	it('유효한 suite YAML을 파싱한다', () => {
		const raw = loadFixture('sample-suite.yaml');
		const result = parseScrySuite(raw);

		expect(result.isOk()).toBe(true);
		const suite = result._unsafeUnwrap();
		expect(suite.suite.name).toBe('TypeScript quality test');
		expect(suite.tasks).toHaveLength(1);
		expect(suite.tasks[0]!.id).toBe('hello-world');
		expect(suite.provider.model).toBe('claude-sonnet-4-20250514');
	});

	it('잘못된 입력은 SchemaError를 반환한다', () => {
		const result = parseScrySuite({ version: 'bad' });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe('SchemaError');
	});

	it('기본값이 올바르게 적용된다', () => {
		const minimal = {
			version: 1,
			suite: { name: 'test' },
			spellbook: './spell.yml',
			tasks: [{ id: 't1', prompt: 'write code', outputPath: 'out.ts' }],
		};
		const result = parseScrySuite(minimal);
		expect(result.isOk()).toBe(true);

		const suite = result._unsafeUnwrap();
		expect(suite.provider.temperature).toBe(0);
		expect(suite.report.format).toBe('terminal');
		expect(suite.tasks[0]!.staticAnalysis.noAny).toBe(true);
	});
});
