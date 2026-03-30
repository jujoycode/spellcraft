import type { CastOutput, DriftChange, DriftStatus } from './types.js';

/** Detect drift between expected cast output and actual file content */
export const detectDrift = (expected: CastOutput, actual: string): DriftStatus => {
	if (expected.content === actual) {
		return { _tag: 'InSync' };
	}

	const changes = classifyChanges(expected.content, actual);
	return { _tag: 'Drifted', changes };
};

/** Classify line-level changes between expected and actual content */
const classifyChanges = (expected: string, actual: string): readonly DriftChange[] => {
	const expectedLines = expected.split('\n');
	const actualLines = actual.split('\n');
	const changes: DriftChange[] = [];

	const maxLen = Math.max(expectedLines.length, actualLines.length);

	for (let i = 0; i < maxLen; i++) {
		const exp = expectedLines[i];
		const act = actualLines[i];

		if (exp === undefined && act !== undefined) {
			changes.push({
				type: 'added',
				spellId: null,
				detail: `Line ${i + 1}: "${act}"`,
			});
		} else if (exp !== undefined && act === undefined) {
			changes.push({
				type: 'removed',
				spellId: null,
				detail: `Line ${i + 1}: "${exp}"`,
			});
		} else if (exp !== act) {
			changes.push({
				type: 'modified',
				spellId: null,
				detail: `Line ${i + 1}: "${exp}" → "${act}"`,
			});
		}
	}

	return changes;
};
