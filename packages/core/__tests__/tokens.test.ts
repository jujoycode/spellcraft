import { describe, expect, it } from 'vitest';
import { estimateTokens } from '../src/tokens.js';

describe('estimateTokens', () => {
	it('단어 수 기반으로 토큰을 추정한다', () => {
		const result = estimateTokens('hello world foo bar');
		expect(result).toBe(Math.ceil(4 * 1.3));
	});

	it('빈 문자열은 0을 반환한다', () => {
		expect(estimateTokens('')).toBe(0);
	});

	it('공백만 있는 문자열은 0을 반환한다', () => {
		expect(estimateTokens('   ')).toBe(0);
	});

	it('여러 줄의 텍스트를 처리한다', () => {
		const content = 'line one\nline two\nline three';
		expect(estimateTokens(content)).toBe(Math.ceil(6 * 1.3));
	});
});
