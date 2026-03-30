import { resolve, dirname } from 'node:path';
import { castForTarget, parseSpellbook } from '@spellcraft/core';
import type { FormatFn } from '@spellcraft/core';
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

	const format: FormatFn = (project, spells, _target) => {
		const outputs = gen.generate(project, spells);
		return {
			filePath: outputs[0]?.filePath ?? 'CLAUDE.md',
			content: outputs.map((o) => o.content).join('\n'),
		};
	};

	const castOutput = castForTarget(book, 'claude', format);

	// 4. Create Claude client
	const clientResult = createClaudeClient(suite.provider);
	if (clientResult.isErr()) {
		logger.error(String(clientResult.error.cause));
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
		const withPrompt = buildWithSpellsPrompt(castOutput.content, task);
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

		// Run tests
		const withTests = await runTests(task.tests, suiteDir);
		const withoutTests = await runTests(task.tests, suiteDir);

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
	const improved = taskResults.filter((r) => r.delta.verdict === 'improved').length;
	const degraded = taskResults.filter((r) => r.delta.verdict === 'degraded').length;
	const neutral = taskResults.filter((r) => r.delta.verdict === 'neutral').length;
	const avgTestDelta =
		taskResults.reduce((sum, r) => sum + r.delta.testPassRateDelta, 0) / (taskResults.length || 1);
	const avgStaticDelta =
		taskResults.reduce((sum, r) => sum + r.delta.staticScoreDelta, 0) / (taskResults.length || 1);

	const summary: ScryReportSummary = {
		totalTasks: taskResults.length,
		improved,
		neutral,
		degraded,
		averageTestDelta: avgTestDelta,
		averageStaticDelta: avgStaticDelta,
		overallVerdict: improved > degraded ? 'improved' : degraded > improved ? 'degraded' : 'neutral',
	};

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
