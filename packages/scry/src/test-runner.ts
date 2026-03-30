import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ScryTestDef, TestRunResult } from './types.js';

const execFileAsync = promisify(execFile);

/** Run tests against generated code and return structured results */
export const runTests = async (
	tests: readonly ScryTestDef[],
	cwd: string,
): Promise<TestRunResult> => {
	if (tests.length === 0) {
		return { totalTests: 0, passed: 0, failed: 0, errors: [], passRate: 1 };
	}

	const allResults: TestRunResult[] = [];

	for (const test of tests) {
		const result = await runSingleTestFile(test, cwd);
		allResults.push(result);
	}

	const totalTests = allResults.reduce((sum, r) => sum + r.totalTests, 0);
	const passed = allResults.reduce((sum, r) => sum + r.passed, 0);
	const failed = allResults.reduce((sum, r) => sum + r.failed, 0);
	const errors = allResults.flatMap((r) => r.errors);
	const passRate = totalTests > 0 ? passed / totalTests : 0;

	return { totalTests, passed, failed, errors, passRate };
};

const runSingleTestFile = async (
	test: ScryTestDef,
	cwd: string,
): Promise<TestRunResult> => {
	const cmd = getTestCommand(test.runner);

	try {
		const { stdout } = await execFileAsync(cmd.bin, [...cmd.args, test.path], {
			cwd,
			timeout: 60_000,
			env: { ...process.env, NODE_ENV: 'test' },
		});

		return parseTestOutput(stdout);
	} catch (error) {
		const stderr =
			error instanceof Error && 'stderr' in error ? String((error as { stderr: unknown }).stderr) : '';
		const stdout =
			error instanceof Error && 'stdout' in error ? String((error as { stdout: unknown }).stdout) : '';

		const parsed = parseTestOutput(stdout);
		if (parsed.totalTests > 0) {
			return parsed;
		}

		return {
			totalTests: 1,
			passed: 0,
			failed: 1,
			errors: [stderr || (error instanceof Error ? error.message : String(error))],
			passRate: 0,
		};
	}
};

const getTestCommand = (runner: ScryTestDef['runner']): { bin: string; args: readonly string[] } => {
	switch (runner) {
		case 'vitest':
			return { bin: 'npx', args: ['vitest', 'run', '--reporter=json'] };
		case 'jest':
			return { bin: 'npx', args: ['jest', '--json'] };
		case 'node:test':
			return { bin: 'node', args: ['--test'] };
	}
};

/** Parse vitest/jest JSON output to extract pass/fail counts */
const parseTestOutput = (output: string): TestRunResult => {
	try {
		const jsonMatch = output.match(/\{[\s\S]*"numPassedTests"[\s\S]*\}/);
		if (jsonMatch) {
			const data = JSON.parse(jsonMatch[0]) as {
				numTotalTests?: number;
				numPassedTests?: number;
				numFailedTests?: number;
			};
			const total = data.numTotalTests ?? 0;
			const passed = data.numPassedTests ?? 0;
			const failed = data.numFailedTests ?? 0;
			return {
				totalTests: total,
				passed,
				failed,
				errors: [],
				passRate: total > 0 ? passed / total : 0,
			};
		}
	} catch {
		// fall through to default
	}

	const passMatch = output.match(/(\d+)\s*(?:passed|passing)/);
	const failMatch = output.match(/(\d+)\s*(?:failed|failing)/);
	const passed = passMatch ? Number.parseInt(passMatch[1]!, 10) : 0;
	const failed = failMatch ? Number.parseInt(failMatch[1]!, 10) : 0;
	const total = passed + failed;

	return {
		totalTests: total,
		passed,
		failed,
		errors: [],
		passRate: total > 0 ? passed / total : 0,
	};
};
