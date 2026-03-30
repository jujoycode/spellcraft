import { describe, expect, it } from 'vitest';
import { formatJson, formatMarkdown, formatTerminal } from '../src/report-formatter.js';
import type { ScryReport } from '../src/types.js';

const report: ScryReport = {
	suite: 'Test Suite',
	timestamp: '2026-03-30T12:00:00Z',
	provider: { model: 'claude-sonnet-4-20250514', maxTokens: 4096, temperature: 0 },
	taskResults: [
		{
			taskId: 'task-1',
			withSpells: {
				generatedCode: '',
				testResults: { totalTests: 10, passed: 8, failed: 2, errors: [], passRate: 0.8 },
				staticAnalysisResults: {
					anyCount: 0,
					consoleLogCount: 0,
					throwCount: 0,
					lineLengthViolations: 0,
					customViolations: [],
					score: 92,
				},
				score: 83.6,
			},
			withoutSpells: {
				generatedCode: '',
				testResults: { totalTests: 10, passed: 5, failed: 5, errors: [], passRate: 0.5 },
				staticAnalysisResults: {
					anyCount: 2,
					consoleLogCount: 1,
					throwCount: 0,
					lineLengthViolations: 0,
					customViolations: [],
					score: 77,
				},
				score: 58.1,
			},
			delta: {
				testPassRateDelta: 0.3,
				staticScoreDelta: 15,
				overallDelta: 25.5,
				verdict: 'improved',
			},
		},
	],
	summary: {
		totalTasks: 1,
		improved: 1,
		neutral: 0,
		degraded: 0,
		averageTestDelta: 0.3,
		averageStaticDelta: 15,
		overallVerdict: 'improved',
	},
};

describe('formatTerminal', () => {
	it('터미널 리포트를 생성한다', () => {
		const output = formatTerminal(report);
		expect(output).toContain('Scry Report');
		expect(output).toContain('Test Suite');
		expect(output).toContain('task-1');
		expect(output).toContain('IMPROVED');
	});
});

describe('formatJson', () => {
	it('유효한 JSON을 반환한다', () => {
		const output = formatJson(report);
		expect(() => JSON.parse(output)).not.toThrow();
	});
});

describe('formatMarkdown', () => {
	it('마크다운 테이블을 포함한다', () => {
		const output = formatMarkdown(report);
		expect(output).toContain('# Scry Report');
		expect(output).toContain('| task-1');
	});
});
