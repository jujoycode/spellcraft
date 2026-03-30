import type { ProjectMeta, Spell, SpellId, Target } from '@spellcraft/core';
import { describe, expect, it } from 'vitest';
import { claudeGenerator } from '../src/claude.js';
import { clineGenerator } from '../src/cline.js';
import { codexGenerator } from '../src/codex.js';
import { copilotGenerator } from '../src/copilot.js';
import { cursorGenerator } from '../src/cursor.js';
import { windsurfGenerator } from '../src/windsurf.js';
import { getAllGenerators, getGenerator } from '../src/index.js';

const makeSpell = (overrides: Partial<Spell> = {}): Spell => ({
	id: 'test-spell' as SpellId,
	description: '테스트 주문',
	content: 'TypeScript strict 모드를 사용한다.',
	targets: ['claude', 'cursor'] as readonly Target[],
	globs: ['**/*.ts'] as readonly string[],
	alwaysApply: false,
	...overrides,
});

const makeProject = (overrides: Partial<ProjectMeta> = {}): ProjectMeta => ({
	name: 'my-project',
	description: '테스트 프로젝트',
	...overrides,
});

describe('claudeGenerator', () => {
	it('단일 CLAUDE.md 파일을 생성한다', () => {
		const outputs = claudeGenerator.generate(makeProject(), [makeSpell()]);
		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.filePath).toBe('CLAUDE.md');
	});

	it('프로젝트 헤더와 설명을 포함한다', () => {
		const outputs = claudeGenerator.generate(makeProject(), [makeSpell()]);
		const content = outputs[0]?.content ?? '';
		expect(content).toContain('# Project: my-project');
		expect(content).toContain('테스트 프로젝트');
	});

	it('주문의 설명과 내용을 Markdown 섹션으로 출력한다', () => {
		const outputs = claudeGenerator.generate(makeProject(), [makeSpell()]);
		const content = outputs[0]?.content ?? '';
		expect(content).toContain('## 테스트 주문');
		expect(content).toContain('TypeScript strict 모드를 사용한다.');
	});

	it('설명이 없는 프로젝트도 처리한다', () => {
		const outputs = claudeGenerator.generate(makeProject({ description: undefined }), [
			makeSpell(),
		]);
		const content = outputs[0]?.content ?? '';
		expect(content).toContain('# Project: my-project');
		expect(content).not.toContain('undefined');
	});

	it('여러 주문을 순서대로 포함한다', () => {
		const spells = [
			makeSpell({ id: 'first' as SpellId, description: '첫 번째 주문' }),
			makeSpell({ id: 'second' as SpellId, description: '두 번째 주문' }),
		];
		const outputs = claudeGenerator.generate(makeProject(), spells);
		const content = outputs[0]?.content ?? '';
		const firstIdx = content.indexOf('첫 번째 주문');
		const secondIdx = content.indexOf('두 번째 주문');
		expect(firstIdx).toBeLessThan(secondIdx);
	});
});

describe('cursorGenerator', () => {
	it('주문 하나당 하나의 .mdc 파일을 생성한다', () => {
		const spells = [
			makeSpell({ id: 'spell-a' as SpellId }),
			makeSpell({ id: 'spell-b' as SpellId }),
		];
		const outputs = cursorGenerator.generate(makeProject(), spells);
		expect(outputs).toHaveLength(2);
		expect(outputs[0]?.filePath).toBe('.cursor/rules/spell-a.mdc');
		expect(outputs[1]?.filePath).toBe('.cursor/rules/spell-b.mdc');
	});

	it('YAML frontmatter를 올바르게 포함한다', () => {
		const spell = makeSpell({
			description: 'TypeScript 규칙',
			globs: ['**/*.ts', '**/*.tsx'] as readonly string[],
			alwaysApply: true,
		});
		const outputs = cursorGenerator.generate(makeProject(), [spell]);
		const content = outputs[0]?.content ?? '';
		expect(content).toMatch(/^---\n/);
		expect(content).toContain('description: TypeScript 규칙');
		expect(content).toContain('globs: **/*.ts, **/*.tsx');
		expect(content).toContain('alwaysApply: true');
		expect(content).toMatch(/---\n\n/);
	});

	it('globs가 비어있으면 빈 문자열로 출력한다', () => {
		const spell = makeSpell({ globs: [] as readonly string[] });
		const outputs = cursorGenerator.generate(makeProject(), [spell]);
		const content = outputs[0]?.content ?? '';
		expect(content).toContain('globs: \n');
	});

	it('주문 내용을 frontmatter 뒤에 포함한다', () => {
		const outputs = cursorGenerator.generate(makeProject(), [makeSpell()]);
		const content = outputs[0]?.content ?? '';
		const frontmatterEnd = content.indexOf('---\n\n');
		const contentStart = content.indexOf('TypeScript strict 모드를 사용한다.');
		expect(frontmatterEnd).toBeLessThan(contentStart);
	});
});

describe('copilotGenerator', () => {
	it('.github/copilot-instructions.md 파일을 생성한다', () => {
		const outputs = copilotGenerator.generate(makeProject(), [makeSpell()]);
		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.filePath).toBe('.github/copilot-instructions.md');
	});

	it('프로젝트 헤더와 주문 내용을 포함한다', () => {
		const outputs = copilotGenerator.generate(makeProject(), [makeSpell()]);
		const content = outputs[0]?.content ?? '';
		expect(content).toContain('# Project: my-project');
		expect(content).toContain('## 테스트 주문');
	});
});

describe('windsurfGenerator', () => {
	it('.windsurfrules 파일을 생성한다', () => {
		const outputs = windsurfGenerator.generate(makeProject(), [makeSpell()]);
		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.filePath).toBe('.windsurfrules');
	});
});

describe('clineGenerator', () => {
	it('.clinerules 파일을 생성한다', () => {
		const outputs = clineGenerator.generate(makeProject(), [makeSpell()]);
		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.filePath).toBe('.clinerules');
	});
});

describe('codexGenerator', () => {
	it('AGENTS.md 파일을 생성한다', () => {
		const outputs = codexGenerator.generate(makeProject(), [makeSpell()]);
		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.filePath).toBe('AGENTS.md');
	});
});

describe('generatorRegistry', () => {
	it('6개의 모든 타겟에 대한 제너레이터를 등록한다', () => {
		const targets: readonly Target[] = ['claude', 'cursor', 'copilot', 'windsurf', 'cline', 'codex'];
		for (const target of targets) {
			const generator = getGenerator(target);
			expect(generator).toBeDefined();
			expect(generator?.target).toBe(target);
		}
	});

	it('getAllGenerators가 6개의 제너레이터를 반환한다', () => {
		const generators = getAllGenerators();
		expect(generators).toHaveLength(6);
	});

	it('존재하지 않는 타겟은 undefined를 반환한다', () => {
		const generator = getGenerator('nonexistent' as Target);
		expect(generator).toBeUndefined();
	});
});
