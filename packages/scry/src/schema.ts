import * as v from 'valibot';

const ScryTestDefSchema = v.object({
	path: v.string(),
	runner: v.optional(v.picklist(['vitest', 'jest', 'node:test']), 'vitest'),
});

const CustomPatternSchema = v.object({
	pattern: v.string(),
	severity: v.picklist(['error', 'warn']),
	message: v.string(),
});

const StaticAnalysisConfigSchema = v.object({
	noAny: v.optional(v.boolean(), true),
	noConsoleLog: v.optional(v.boolean(), false),
	noThrow: v.optional(v.boolean(), false),
	maxLineLength: v.optional(v.number(), 120),
	customPatterns: v.optional(v.array(CustomPatternSchema), []),
});

const ScryTaskSchema = v.object({
	id: v.string(),
	description: v.optional(v.string(), ''),
	prompt: v.pipe(v.string(), v.nonEmpty()),
	outputPath: v.string(),
	tests: v.optional(v.array(ScryTestDefSchema), []),
	staticAnalysis: v.optional(StaticAnalysisConfigSchema, {
		noAny: true,
		noConsoleLog: false,
		noThrow: false,
		maxLineLength: 120,
		customPatterns: [],
	}),
});

const ScryProviderConfigSchema = v.object({
	model: v.optional(v.string(), 'claude-sonnet-4-20250514'),
	maxTokens: v.optional(v.number(), 4096),
	temperature: v.optional(v.number(), 0),
});

const ScryReportConfigSchema = v.object({
	format: v.optional(v.picklist(['terminal', 'json', 'markdown']), 'terminal'),
	outputPath: v.optional(v.string()),
});

export const ScrySuiteSchema = v.object({
	version: v.number(),
	suite: v.object({
		name: v.string(),
		description: v.optional(v.string(), ''),
	}),
	spellbook: v.string(),
	provider: v.optional(ScryProviderConfigSchema, {
		model: 'claude-sonnet-4-20250514',
		maxTokens: 4096,
		temperature: 0,
	}),
	tasks: v.array(ScryTaskSchema),
	report: v.optional(ScryReportConfigSchema, { format: 'terminal' }),
});
