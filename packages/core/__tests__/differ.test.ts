import { describe, expect, it } from 'vitest';
import { detectDrift } from '../src/differ.js';
import type { CastOutput, SpellId } from '../src/types.js';

const output = (content: string): CastOutput => ({
	target: 'claude',
	filePath: 'CLAUDE.md',
	content,
	tokenCount: 10,
	spellsCast: ['test' as SpellId],
});

describe('detectDrift', () => {
	it('동일한 내용이면 InSync를 반환한다', () => {
		const result = detectDrift(output('hello\nworld'), 'hello\nworld');
		expect(result._tag).toBe('InSync');
	});

	it('내용이 다르면 Drifted를 반환한다', () => {
		const result = detectDrift(output('line1\nline2'), 'line1\nmodified');
		expect(result._tag).toBe('Drifted');
		if (result._tag === 'Drifted') {
			expect(result.changes.length).toBeGreaterThan(0);
			expect(result.changes[0]!.type).toBe('modified');
		}
	});

	it('추가된 줄을 감지한다', () => {
		const result = detectDrift(output('line1'), 'line1\nline2');
		expect(result._tag).toBe('Drifted');
		if (result._tag === 'Drifted') {
			expect(result.changes.some((c) => c.type === 'added')).toBe(true);
		}
	});

	it('삭제된 줄을 감지한다', () => {
		const result = detectDrift(output('line1\nline2'), 'line1');
		expect(result._tag).toBe('Drifted');
		if (result._tag === 'Drifted') {
			expect(result.changes.some((c) => c.type === 'removed')).toBe(true);
		}
	});

	it('빈 내용끼리는 InSync이다', () => {
		expect(detectDrift(output(''), '')._tag).toBe('InSync');
	});
});
