import { describe, expect, it } from 'vitest';
import { computeDelta, computeScore } from '../src/scorer.js';
import type { ScryVariantResult, StaticAnalysisResult, TestRunResult } from '../src/types.js';

const testResult = (passRate: number, total = 10): TestRunResult => ({
	totalTests: total,
	passed: Math.round(total * passRate),
	failed: total - Math.round(total * passRate),
	errors: [],
	passRate,
});

const staticResult = (score: number): StaticAnalysisResult => ({
	anyCount: 0,
	consoleLogCount: 0,
	throwCount: 0,
	lineLengthViolations: 0,
	customViolations: [],
	score,
});

const variant = (passRate: number, staticScore: number): ScryVariantResult => {
	const tr = testResult(passRate);
	const sr = staticResult(staticScore);
	return {
		generatedCode: '',
		testResults: tr,
		staticAnalysisResults: sr,
		score: computeScore(tr, sr),
	};
};

describe('computeScore', () => {
	it('테스트 70% + 정적 30%로 가중 평균한다', () => {
		const score = computeScore(testResult(0.8), staticResult(90));
		expect(score).toBeCloseTo(0.8 * 100 * 0.7 + 90 * 0.3);
	});
});

describe('computeDelta', () => {
	it('개선되면 improved를 반환한다', () => {
		const delta = computeDelta(variant(0.9, 95), variant(0.5, 70));
		expect(delta.verdict).toBe('improved');
		expect(delta.overallDelta).toBeGreaterThan(0);
	});

	it('악화되면 degraded를 반환한다', () => {
		const delta = computeDelta(variant(0.3, 50), variant(0.9, 95));
		expect(delta.verdict).toBe('degraded');
	});

	it('차이가 3 이내면 neutral을 반환한다', () => {
		const delta = computeDelta(variant(0.8, 90), variant(0.8, 89));
		expect(delta.verdict).toBe('neutral');
	});
});
