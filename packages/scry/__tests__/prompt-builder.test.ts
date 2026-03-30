import { describe, expect, it } from 'vitest';
import { buildWithSpellsPrompt, buildWithoutSpellsPrompt } from '../src/prompt-builder.js';
import type { ScryTask } from '../src/types.js';

const task: ScryTask = {
	id: 'test-task',
	description: 'test',
	prompt: 'Write a function.',
	outputPath: '.scry/out.ts',
	tests: [],
	staticAnalysis: {
		noAny: true,
		noConsoleLog: false,
		noThrow: false,
		maxLineLength: 120,
		customPatterns: [],
	},
};

describe('buildWithSpellsPrompt', () => {
	it('cast 내용을 system prompt에 포함한다', () => {
		const result = buildWithSpellsPrompt('Use TypeScript strict.', task);
		expect(result.system).toBe('Use TypeScript strict.');
		expect(result.user).toContain('Write a function.');
	});
});

describe('buildWithoutSpellsPrompt', () => {
	it('system prompt가 비어있다', () => {
		const result = buildWithoutSpellsPrompt(task);
		expect(result.system).toBe('');
		expect(result.user).toContain('Write a function.');
	});
});
