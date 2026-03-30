import { describe, expect, it } from 'vitest';
import { analyzeStatic, checkCustomPatterns, checkLineLength, countAnyUsage, countConsoleLog, countThrowStatements } from '../src/static-analyzer.js';

describe('countAnyUsage', () => {
	it('any 타입 사용을 카운트한다', () => {
		expect(countAnyUsage('const x: any = 1; let y: any;')).toBe(2);
	});

	it('any가 없으면 0을 반환한다', () => {
		expect(countAnyUsage('const x: string = "hello";')).toBe(0);
	});
});

describe('countConsoleLog', () => {
	it('console 호출을 카운트한다', () => {
		expect(countConsoleLog('console.log("hi"); console.error("err");')).toBe(2);
	});
});

describe('countThrowStatements', () => {
	it('throw 문을 카운트한다', () => {
		expect(countThrowStatements('throw new Error("x"); throw e;')).toBe(2);
	});
});

describe('checkLineLength', () => {
	it('긴 줄을 감지한다', () => {
		const source = 'short\n' + 'a'.repeat(130) + '\nok';
		expect(checkLineLength(source, 120)).toBe(1);
	});
});

describe('checkCustomPatterns', () => {
	it('커스텀 패턴 매칭을 수행한다', () => {
		const result = checkCustomPatterns('as any; as any;', [
			{ pattern: 'as any', severity: 'error', message: 'No type assertion' },
		]);
		expect(result).toHaveLength(1);
		expect(result[0]!.count).toBe(2);
	});
});

describe('analyzeStatic', () => {
	it('종합 점수를 계산한다', () => {
		const source = 'const x: any = 1;\nconsole.log(x);';
		const result = analyzeStatic(source, {
			noAny: true,
			noConsoleLog: true,
			noThrow: false,
			maxLineLength: 120,
			customPatterns: [],
		});
		expect(result.anyCount).toBe(1);
		expect(result.consoleLogCount).toBe(1);
		expect(result.score).toBe(100 - 5 - 3); // 92
	});

	it('위반이 없으면 100점이다', () => {
		const result = analyzeStatic('const x: string = "ok";', {
			noAny: true,
			noConsoleLog: true,
			noThrow: true,
			maxLineLength: 120,
			customPatterns: [],
		});
		expect(result.score).toBe(100);
	});

	it('점수는 0 미만으로 내려가지 않는다', () => {
		const source = Array.from({ length: 30 }, () => 'const x: any = 1;').join('\n');
		const result = analyzeStatic(source, {
			noAny: true,
			noConsoleLog: false,
			noThrow: false,
			maxLineLength: 120,
			customPatterns: [],
		});
		expect(result.score).toBe(0);
	});
});
