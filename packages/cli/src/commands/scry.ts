import { resolve, dirname } from 'node:path';
import { pipe } from 'remeda';
import { match } from 'ts-pattern';
import { castForTarget, parseSpellbook } from '@spellcraft/core';
import type { CastFile, FormatFn } from '@spellcraft/core';
import { getGenerator } from '@spellcraft/generators';
import {
	parseScrySuite,
	createClaudeClient,
	buildWithSpellsPrompt,
	buildWithoutSpellsPrompt,
	analyzeStatic,
	computeScore,
	computeDelta,
	formatReport,
	runTests,
} from '@spellcraft/scry';
import type {
	ScryReport,
	ScryReportSummary,
	ScryTaskResult,
	ScryVariantResult,
} from '@spellcraft/scry';
import { readYaml, writeOutput } from '../io.js';
import { logger } from '../logger.js';

export const scryCommand = async (suitePath: string): Promise<void> => {
	// 1. Parse scry suite
	const suiteRaw = await readYaml(suitePath);
	if (suiteRaw.isErr()) {
		logger.error(`Failed to read suite: ${String(suiteRaw.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const suiteResult = parseScrySuite(suiteRaw.value);
	if (suiteResult.isErr()) {
		logger.error(`Suite parse error: ${suiteResult.error._tag}`);
		process.exitCode = 1;
		return;
	}

	const suite = suiteResult.value;
	const suiteDir = dirname(resolve(suitePath));

	// 2. Parse spellbook
	const spellbookPath = resolve(suiteDir, suite.spellbook);
	const spellbookRaw = await readYaml(spellbookPath);
	if (spellbookRaw.isErr()) {
		logger.error(`Failed to read spellbook: ${String(spellbookRaw.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	const bookResult = parseSpellbook(spellbookRaw.value);
	if (bookResult.isErr()) {
		logger.error('Failed to parse spellbook');
		process.exitCode = 1;
		return;
	}

	const book = bookResult.value;

	// 3. Cast for claude target to get system prompt
	const gen = getGenerator('claude');
	if (!gen) {
		logger.error('Claude generator not found');
		process.exitCode = 1;
		return;
	}

	const format: FormatFn = (project, spells, _target): readonly CastFile[] =>
		gen.generate(project, spells).map((o) => ({ filePath: o.filePath, content: o.content }));

	const castOutput = castForTarget(book, 'claude', format);
	const systemPrompt = castOutput.files.map((f) => f.content).join('\n');

	// 4. Create Claude client
	const clientResult = createClaudeClient(suite.provider);
	if (clientResult.isErr()) {
		match(clientResult.error)
			.with({ _tag: 'ConfigError' }, (e) => logger.error(e.message))
			.otherwise((e) => logger.error(String(e._tag)));
		process.exitCode = 1;
		return;
	}

	const client = clientResult.value;

	logger.scry(`Starting eval: "${suite.suite.name}" (${suite.tasks.length} tasks)`);

	// 5. Run each task
	const taskResults: ScryTaskResult[] = [];

	for (const task of suite.tasks) {
		logger.info(`Task: ${task.id}`);

		// With spells
		const withPrompt = buildWithSpellsPrompt(systemPrompt, task);
		const withResponse = await client.call(withPrompt.system, withPrompt.user);
		if (withResponse.isErr()) {
			logger.error(`API call failed (with spells): ${String(withResponse.error.cause)}`);
			continue;
		}

		const withCode = withResponse.value;
		const withOutputPath = resolve(suiteDir, task.outputPath);
		await writeOutput(withOutputPath, withCode);

		// Without spells
		const withoutPrompt = buildWithoutSpellsPrompt(task);
		const withoutResponse = await client.call(withoutPrompt.system, withoutPrompt.user);
		if (withoutResponse.isErr()) {
			logger.error(`API call failed (without spells): ${String(withoutResponse.error.cause)}`);
			continue;
		}

		const withoutCode = withoutResponse.value;
		const withoutOutputPath = resolve(suiteDir, '.scry/generated-without', `${task.id}.ts`);
		await writeOutput(withoutOutputPath, withoutCode);

		// Run tests for "with spells" variant (code already at outputPath)
		const withTests = await runTests(task.tests, suiteDir);

		// Swap: write "without" code to outputPath, run tests, then restore
		await writeOutput(withOutputPath, withoutCode);
		const withoutTests = await runTests(task.tests, suiteDir);
		await writeOutput(withOutputPath, withCode);

		// Static analysis
		const withStatic = analyzeStatic(withCode, task.staticAnalysis);
		const withoutStatic = analyzeStatic(withoutCode, task.staticAnalysis);

		// Score
		const withScore = computeScore(withTests, withStatic);
		const withoutScore = computeScore(withoutTests, withoutStatic);

		const withVariant: ScryVariantResult = {
			generatedCode: withCode,
			testResults: withTests,
			staticAnalysisResults: withStatic,
			score: withScore,
		};

		const withoutVariant: ScryVariantResult = {
			generatedCode: withoutCode,
			testResults: withoutTests,
			staticAnalysisResults: withoutStatic,
			score: withoutScore,
		};

		const delta = computeDelta(withVariant, withoutVariant);

		taskResults.push({
			taskId: task.id,
			withSpells: withVariant,
			withoutSpells: withoutVariant,
			delta,
		});

		logger.info(`  ${delta.verdict}: overall delta ${delta.overallDelta >= 0 ? '+' : ''}${delta.overallDelta.toFixed(1)}`);
	}

	// 6. Build report
	const summary: ScryReportSummary = pipe(
		taskResults,
		(results) => ({
			totalTasks: results.length,
			improved: results.filter((r) => r.delta.verdict === 'improved').length,
			neutral: results.filter((r) => r.delta.verdict === 'neutral').length,
			degraded: results.filter((r) => r.delta.verdict === 'degraded').length,
			averageTestDelta: results.reduce((sum, r) => sum + r.delta.testPassRateDelta, 0) / (results.length || 1),
			averageStaticDelta: results.reduce((sum, r) => sum + r.delta.staticScoreDelta, 0) / (results.length || 1),
			overallVerdict: (() => {
				const imp = results.filter((r) => r.delta.verdict === 'improved').length;
				const deg = results.filter((r) => r.delta.verdict === 'degraded').length;
				return imp > deg ? 'improved' as const : deg > imp ? 'degraded' as const : 'neutral' as const;
			})(),
		}),
	);

	const report: ScryReport = {
		suite: suite.suite.name,
		timestamp: new Date().toISOString(),
		provider: suite.provider,
		taskResults,
		summary,
	};

	const output = formatReport(report, suite.report.format);
	console.log(output);

	if (suite.report.outputPath) {
		await writeOutput(resolve(suiteDir, suite.report.outputPath), output);
		logger.success(`Report written to ${suite.report.outputPath}`);
	}
};
