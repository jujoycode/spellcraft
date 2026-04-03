import { match } from 'ts-pattern';
import type { Diagnostic, SpellId, Spellbook } from './types.js';
import { estimateTokens } from './tokens.js';

type InspectRule = (book: Spellbook) => readonly Diagnostic[];

const VAGUE_PATTERNS = [
	'잘 작성',
	'깔끔하게',
	'적절하게',
	'좋은 코드',
	'write good',
	'clean code',
	'appropriate',
	'properly',
	'best practices',
];

const DEFAULT_TOKEN_BUDGET = 8000;

const TOOL_CATEGORIES: readonly (readonly string[])[] = [
	['jest', 'vitest', 'mocha', 'ava'],
	['drizzle', 'prisma', 'typeorm', 'sequelize'],
	['express', 'hono', 'fastify', 'koa'],
	['npm', 'pnpm', 'yarn', 'bun'],
];

export const checkVagueness: InspectRule = (book) =>
	book.spells.flatMap((spell) =>
		VAGUE_PATTERNS.filter((p) => spell.content.toLowerCase().includes(p.toLowerCase())).map(
			(p): Diagnostic => ({
				severity: 'warn',
				spellId: spell.id,
				code: 'VAGUE',
				message: `"${p}"은 측정 불가능한 표현입니다. 구체적 기준을 명시하세요.`,
			}),
		),
	);

/** Extract tool names mentioned via "X를 사용" or "use X" patterns */
const extractToolMentions = (content: string): readonly string[] => {
	const lower = content.toLowerCase();
	const korean = [...lower.matchAll(/(\w+)(?:를|을)?\s*사용/g)].map((m) => m[1] ?? '');
	const english = [...lower.matchAll(/(?:use|using)\s+(\w+)/g)].map((m) => m[1] ?? '');
	return [...korean, ...english].filter((t) => t.length > 0);
};

/** Check if two tools are in the same category */
const isSameCategory = (a: string, b: string): boolean =>
	TOOL_CATEGORIES.some(
		(cat) => cat.includes(a.toLowerCase()) && cat.includes(b.toLowerCase()),
	);

/** Find conflicting tool pairs between two tool lists */
const findConflictingPair = (
	toolsA: readonly string[],
	toolsB: readonly string[],
): readonly [string, string][] =>
	toolsA.flatMap((a) =>
		toolsB
			.filter((b) => a !== b && isSameCategory(a, b))
			.map((b): [string, string] => [a, b]),
	);

/** Check if two spells share targets (or both are global) */
const hasOverlappingTargets = (
	a: { readonly targets: readonly string[] },
	b: { readonly targets: readonly string[] },
): boolean =>
	(a.targets.length === 0 && b.targets.length === 0) ||
	a.targets.some((t) => b.targets.includes(t));

/** Generate all unique pairs from a list */
const pairs = <T>(items: readonly T[]): readonly [T, T][] =>
	items.flatMap((a, i) => items.slice(i + 1).map((b): [T, T] => [a, b]));

/** Find spells with overlapping targets and contradicting content keywords */
export const checkConflicts: InspectRule = (book) =>
	pairs(book.spells)
		.filter(([a, b]) => hasOverlappingTargets(a, b))
		.flatMap(([a, b]) => {
			const toolsA = extractToolMentions(a.content);
			const toolsB = extractToolMentions(b.content);
			const conflicts = findConflictingPair(toolsA, toolsB);

			return conflicts.map(
				([toolA, toolB]): Diagnostic => ({
					severity: 'error',
					spellId: a.id,
					code: 'CONFLICT',
					message: `"${a.id}"와 "${b.id}"가 충돌합니다: 같은 카테고리 도구 ${toolA} vs ${toolB}`,
				}),
			);
		});

export const checkTokenBudget: InspectRule = (book) =>
	book.targets.flatMap((target) => {
		const applicable = book.spells.filter(
			(s) => s.targets.length === 0 || s.targets.includes(target),
		);
		const totalContent = applicable.map((s) => s.content).join('\n\n');
		const tokens = estimateTokens(totalContent);

		return tokens > DEFAULT_TOKEN_BUDGET
			? [
					{
						severity: 'warn' as const,
						spellId: null as SpellId | null,
						code: 'TOKEN_OVER',
						message: `${target}: ${tokens} tokens (권장 ${DEFAULT_TOKEN_BUDGET} 이하)`,
					},
				]
			: [];
	});

export const checkMissingGlobs: InspectRule = (book) =>
	book.spells.flatMap((spell) =>
		match(spell)
			.when(
				(s) => !s.alwaysApply && s.globs.length === 0,
				(s): readonly Diagnostic[] => [
					{
						severity: 'info',
						spellId: s.id,
						code: 'MISSING_GLOBS',
						message: `"${s.id}"는 alwaysApply=false이지만 globs가 비어 있습니다.`,
					},
				],
			)
			.otherwise((): readonly Diagnostic[] => []),
	);

export const inspectAll: InspectRule = (book) =>
	[checkVagueness, checkConflicts, checkTokenBudget, checkMissingGlobs].flatMap((rule) =>
		rule(book),
	);
