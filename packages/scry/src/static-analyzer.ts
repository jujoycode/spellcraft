import type { CustomViolation, StaticAnalysisConfig, StaticAnalysisResult } from './types.js';

/** Count occurrences of `any` type usage (type annotations: `: any`, `<any>`, `as any`) */
export const countAnyUsage = (source: string): number => {
	const patterns = [
		/:\s*any\b/g,
		/<any\b/g,
		/\bas\s+any\b/g,
	];
	return patterns.reduce((sum, pattern) => sum + (source.match(pattern)?.length ?? 0), 0);
};

/** Count console.log/warn/error calls */
export const countConsoleLog = (source: string): number => {
	const matches = source.match(/\bconsole\.\w+/g);
	return matches?.length ?? 0;
};

/** Count throw statements */
export const countThrowStatements = (source: string): number => {
	const matches = source.match(/\bthrow\b/g);
	return matches?.length ?? 0;
};

/** Count lines exceeding max length */
export const checkLineLength = (source: string, maxLength: number): number =>
	source.split('\n').filter((line) => line.length > maxLength).length;

/** Check custom regex patterns */
export const checkCustomPatterns = (
	source: string,
	patterns: readonly { readonly pattern: string; readonly severity: 'error' | 'warn'; readonly message: string }[],
): readonly CustomViolation[] =>
	patterns.map((p) => {
		const regex = new RegExp(p.pattern, 'g');
		const matches = source.match(regex);
		return {
			pattern: p.pattern,
			severity: p.severity,
			message: p.message,
			count: matches?.length ?? 0,
		};
	}).filter((v) => v.count > 0);

const PENALTY_ANY = 5;
const PENALTY_CONSOLE = 3;
const PENALTY_THROW = 2;
const PENALTY_LINE_LENGTH = 1;
const PENALTY_CUSTOM_ERROR = 5;
const PENALTY_CUSTOM_WARN = 2;

/** Run full static analysis and compute score */
export const analyzeStatic = (
	source: string,
	config: StaticAnalysisConfig,
): StaticAnalysisResult => {
	const anyCount = config.noAny ? countAnyUsage(source) : 0;
	const consoleLogCount = config.noConsoleLog ? countConsoleLog(source) : 0;
	const throwCount = config.noThrow ? countThrowStatements(source) : 0;
	const lineLengthViolations = checkLineLength(source, config.maxLineLength);
	const customViolations = checkCustomPatterns(source, config.customPatterns);

	const penalty =
		anyCount * PENALTY_ANY +
		consoleLogCount * PENALTY_CONSOLE +
		throwCount * PENALTY_THROW +
		lineLengthViolations * PENALTY_LINE_LENGTH +
		customViolations.reduce(
			(sum, v) => sum + v.count * (v.severity === 'error' ? PENALTY_CUSTOM_ERROR : PENALTY_CUSTOM_WARN),
			0,
		);

	return {
		anyCount,
		consoleLogCount,
		throwCount,
		lineLengthViolations,
		customViolations,
		score: Math.max(0, 100 - penalty),
	};
};
