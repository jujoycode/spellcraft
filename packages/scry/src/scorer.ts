import type { ScryDelta, ScryVariantResult, StaticAnalysisResult, TestRunResult } from './types.js';

const TEST_WEIGHT = 0.7;
const STATIC_WEIGHT = 0.3;
const NEUTRAL_THRESHOLD = 3;

/** Compute overall score from test results and static analysis */
export const computeScore = (
	testResults: TestRunResult,
	staticResults: StaticAnalysisResult,
): number => {
	const testScore = testResults.passRate * 100;
	return testScore * TEST_WEIGHT + staticResults.score * STATIC_WEIGHT;
};

/** Compute delta between two variant results */
export const computeDelta = (
	withSpells: ScryVariantResult,
	withoutSpells: ScryVariantResult,
): ScryDelta => {
	const testPassRateDelta = withSpells.testResults.passRate - withoutSpells.testResults.passRate;
	const staticScoreDelta =
		withSpells.staticAnalysisResults.score - withoutSpells.staticAnalysisResults.score;
	const overallDelta = withSpells.score - withoutSpells.score;

	const verdict =
		overallDelta > NEUTRAL_THRESHOLD
			? ('improved' as const)
			: overallDelta < -NEUTRAL_THRESHOLD
				? ('degraded' as const)
				: ('neutral' as const);

	return { testPassRateDelta, staticScoreDelta, overallDelta, verdict };
};
