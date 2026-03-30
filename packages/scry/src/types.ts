/** Scry test suite definition — parsed from scry-suite.yaml */

export interface ScryTestDef {
	readonly path: string;
	readonly runner: 'vitest' | 'jest' | 'node:test';
}

export interface CustomPattern {
	readonly pattern: string;
	readonly severity: 'error' | 'warn';
	readonly message: string;
}

export interface StaticAnalysisConfig {
	readonly noAny: boolean;
	readonly noConsoleLog: boolean;
	readonly noThrow: boolean;
	readonly maxLineLength: number;
	readonly customPatterns: readonly CustomPattern[];
}

export interface ScryTask {
	readonly id: string;
	readonly description: string;
	readonly prompt: string;
	readonly outputPath: string;
	readonly tests: readonly ScryTestDef[];
	readonly staticAnalysis: StaticAnalysisConfig;
}

export interface ScryProviderConfig {
	readonly model: string;
	readonly maxTokens: number;
	readonly temperature: number;
}

export interface ScryReportConfig {
	readonly format: 'terminal' | 'json' | 'markdown';
	readonly outputPath?: string;
}

export interface ScrySuite {
	readonly version: number;
	readonly suite: { readonly name: string; readonly description: string };
	readonly spellbook: string;
	readonly provider: ScryProviderConfig;
	readonly tasks: readonly ScryTask[];
	readonly report: ScryReportConfig;
}

/** Scry result types */

export interface TestRunResult {
	readonly totalTests: number;
	readonly passed: number;
	readonly failed: number;
	readonly errors: readonly string[];
	readonly passRate: number;
}

export interface CustomViolation {
	readonly pattern: string;
	readonly severity: 'error' | 'warn';
	readonly message: string;
	readonly count: number;
}

export interface StaticAnalysisResult {
	readonly anyCount: number;
	readonly consoleLogCount: number;
	readonly throwCount: number;
	readonly lineLengthViolations: number;
	readonly customViolations: readonly CustomViolation[];
	readonly score: number;
}

export interface ScryVariantResult {
	readonly generatedCode: string;
	readonly testResults: TestRunResult;
	readonly staticAnalysisResults: StaticAnalysisResult;
	readonly score: number;
}

export interface ScryDelta {
	readonly testPassRateDelta: number;
	readonly staticScoreDelta: number;
	readonly overallDelta: number;
	readonly verdict: 'improved' | 'neutral' | 'degraded';
}

export interface ScryTaskResult {
	readonly taskId: string;
	readonly withSpells: ScryVariantResult;
	readonly withoutSpells: ScryVariantResult;
	readonly delta: ScryDelta;
}

export interface ScryReportSummary {
	readonly totalTasks: number;
	readonly improved: number;
	readonly neutral: number;
	readonly degraded: number;
	readonly averageTestDelta: number;
	readonly averageStaticDelta: number;
	readonly overallVerdict: 'improved' | 'neutral' | 'degraded';
}

export interface ScryReport {
	readonly suite: string;
	readonly timestamp: string;
	readonly provider: ScryProviderConfig;
	readonly taskResults: readonly ScryTaskResult[];
	readonly summary: ScryReportSummary;
}
