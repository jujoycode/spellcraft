import type { ScryReport, ScryTaskResult } from './types.js';

const VERDICT_ICON = {
	improved: '\u25B2',
	neutral: '\u2500',
	degraded: '\u25BC',
} as const;

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const formatTaskRow = (result: ScryTaskResult): string => {
	const { withSpells: ws, withoutSpells: wo, delta: d } = result;
	const icon = VERDICT_ICON[d.verdict];

	return [
		`  ${result.taskId}`,
		`    Tests:   ${ws.testResults.passed}/${ws.testResults.totalTests} (${pct(ws.testResults.passRate)}) vs ${wo.testResults.passed}/${wo.testResults.totalTests} (${pct(wo.testResults.passRate)})  ${d.testPassRateDelta >= 0 ? '+' : ''}${pct(d.testPassRateDelta)} ${icon}`,
		`    Static:  ${ws.staticAnalysisResults.score}/100 vs ${wo.staticAnalysisResults.score}/100  ${d.staticScoreDelta >= 0 ? '+' : ''}${d.staticScoreDelta.toFixed(0)} ${icon}`,
		`    Overall: ${ws.score.toFixed(0)} vs ${wo.score.toFixed(0)}  ${d.overallDelta >= 0 ? '+' : ''}${d.overallDelta.toFixed(0)} ${icon}`,
	].join('\n');
};

/** Format report for terminal output */
export const formatTerminal = (report: ScryReport): string => {
	const header = [
		`\uD83D\uDD2E Scry Report \u2014 "${report.suite}"`,
		`   Model: ${report.provider.model} | Tasks: ${report.summary.totalTasks} | ${report.timestamp}`,
		'',
	].join('\n');

	const tasks = report.taskResults.map(formatTaskRow).join('\n\n');

	const { summary: s } = report;
	const summaryBlock = [
		'',
		'Summary:',
		`  ${VERDICT_ICON.improved} Improved: ${s.improved} | ${VERDICT_ICON.degraded} Degraded: ${s.degraded} | ${VERDICT_ICON.neutral} Neutral: ${s.neutral}`,
		`  Average test delta:   ${s.averageTestDelta >= 0 ? '+' : ''}${pct(s.averageTestDelta)}`,
		`  Average static delta: ${s.averageStaticDelta >= 0 ? '+' : ''}${s.averageStaticDelta.toFixed(0)}`,
		`  Overall verdict:      ${VERDICT_ICON[s.overallVerdict]} ${s.overallVerdict.toUpperCase()}`,
	].join('\n');

	return header + tasks + summaryBlock;
};

/** Format report as JSON */
export const formatJson = (report: ScryReport): string => JSON.stringify(report, null, 2);

/** Format report as Markdown */
export const formatMarkdown = (report: ScryReport): string => {
	const header = `# Scry Report: ${report.suite}\n\n**Model:** ${report.provider.model} | **Tasks:** ${report.summary.totalTasks} | **Date:** ${report.timestamp}\n`;

	const tableHeader =
		'| Task | With Spells | Without | Delta |\n|---|---|---|---|\n';

	const rows = report.taskResults
		.map((r) => {
			const ws = r.withSpells;
			const wo = r.withoutSpells;
			const icon = VERDICT_ICON[r.delta.verdict];
			return `| ${r.taskId} | ${ws.score.toFixed(0)} | ${wo.score.toFixed(0)} | ${r.delta.overallDelta >= 0 ? '+' : ''}${r.delta.overallDelta.toFixed(0)} ${icon} |`;
		})
		.join('\n');

	const summary = `\n\n**Verdict:** ${VERDICT_ICON[report.summary.overallVerdict]} ${report.summary.overallVerdict.toUpperCase()}\n`;

	return header + tableHeader + rows + summary;
};

/** Format report based on configured format */
export const formatReport = (
	report: ScryReport,
	format: 'terminal' | 'json' | 'markdown',
): string => {
	switch (format) {
		case 'terminal':
			return formatTerminal(report);
		case 'json':
			return formatJson(report);
		case 'markdown':
			return formatMarkdown(report);
	}
};
