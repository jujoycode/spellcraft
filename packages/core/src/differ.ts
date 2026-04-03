import { match } from 'ts-pattern';
import type { CastFile, DriftChange, DriftStatus } from './types.js';

/** Detect drift between expected file content and actual file content */
export const detectDrift = (expected: CastFile, actual: string): DriftStatus =>
	expected.content === actual
		? { _tag: 'InSync' }
		: { _tag: 'Drifted', changes: classifyChanges(expected.content, actual) };

/** Classify line-level changes between expected and actual content */
const classifyChanges = (expected: string, actual: string): readonly DriftChange[] => {
	const expectedLines = expected.split('\n');
	const actualLines = actual.split('\n');
	const maxLen = Math.max(expectedLines.length, actualLines.length);

	return Array.from({ length: maxLen }, (_, i): DriftChange | null => {
		const exp = expectedLines[i];
		const act = actualLines[i];

		return match({ exp, act })
			.when(
				({ exp, act }) => exp === undefined && act !== undefined,
				({ act }): DriftChange => ({
					type: 'added',
					spellId: null,
					detail: `Line ${i + 1}: "${act}"`,
				}),
			)
			.when(
				({ exp, act }) => exp !== undefined && act === undefined,
				({ exp }): DriftChange => ({
					type: 'removed',
					spellId: null,
					detail: `Line ${i + 1}: "${exp}"`,
				}),
			)
			.when(
				({ exp, act }) => exp !== act,
				({ exp, act }): DriftChange => ({
					type: 'modified',
					spellId: null,
					detail: `Line ${i + 1}: "${exp}" → "${act}"`,
				}),
			)
			.otherwise(() => null);
	}).filter((c): c is DriftChange => c !== null);
};
