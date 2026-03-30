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

export const checkVagueness: InspectRule = (book) =>
	book.spells.flatMap((spell) => {
		const found = VAGUE_PATTERNS.filter((p) =>
			spell.content.toLowerCase().includes(p.toLowerCase()),
		);
		return found.map(
			(p): Diagnostic => ({
				severity: 'warn',
				spellId: spell.id,
				code: 'VAGUE',
				message: `"${p}"은 측정 불가능한 표현입니다. 구체적 기준을 명시하세요.`,
			}),
		);
	});

/** Find spells with overlapping targets and contradicting content keywords */
export const checkConflicts: InspectRule = (book) => {
	const diagnostics: Diagnostic[] = [];
	const { spells } = book;

	for (let i = 0; i < spells.length; i++) {
		for (let j = i + 1; j < spells.length; j++) {
			const a = spells[i]!;
			const b = spells[j]!;
			const sharedTargets = a.targets.filter((t) => b.targets.includes(t));
			const bothGlobal = a.targets.length === 0 && b.targets.length === 0;

			if (sharedTargets.length === 0 && !bothGlobal) continue;

			const conflict = detectContentConflict(a.content, b.content);
			if (conflict) {
				diagnostics.push({
					severity: 'error',
					spellId: a.id,
					code: 'CONFLICT',
					message: `"${a.id}"와 "${b.id}"가 충돌합니다: ${conflict}`,
				});
			}
		}
	}

	return diagnostics;
};

/** Simple conflict detection: check for opposing statements about same tools */
const detectContentConflict = (contentA: string, contentB: string): string | null => {
	const aLower = contentA.toLowerCase();
	const bLower = contentB.toLowerCase();

	const usedInA = [...aLower.matchAll(/(\w+)(?:를|을)?\s*사용/g)].map((m) => m[1]);
	const usedInB = [...bLower.matchAll(/(\w+)(?:를|을)?\s*사용/g)].map((m) => m[1]);

	for (const toolA of usedInA) {
		if (toolA && bLower.includes(`${toolA}`) && aLower.includes(`${toolA}`) && usedInB.some((t) => t !== toolA && isSameCategory(toolA, t ?? ''))) {
			const conflicting = usedInB.find((t) => t !== toolA && isSameCategory(toolA, t ?? ''));
			if (conflicting) {
				return `같은 카테고리 도구: ${toolA} vs ${conflicting}`;
			}
		}
	}

	return null;
};

/** Check if two tools are in the same category (test runners, ORMs, etc.) */
const isSameCategory = (a: string, b: string): boolean => {
	const categories = [
		['jest', 'vitest', 'mocha', 'ava'],
		['drizzle', 'prisma', 'typeorm', 'sequelize'],
		['express', 'hono', 'fastify', 'koa'],
		['npm', 'pnpm', 'yarn', 'bun'],
	];

	return categories.some((cat) => cat.includes(a.toLowerCase()) && cat.includes(b.toLowerCase()));
};

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
		!spell.alwaysApply && spell.globs.length === 0
			? [
					{
						severity: 'info' as const,
						spellId: spell.id,
						code: 'MISSING_GLOBS',
						message: `"${spell.id}"는 alwaysApply=false이지만 globs가 비어 있습니다.`,
					},
				]
			: [],
	);

export const inspectAll: InspectRule = (book) =>
	[checkVagueness, checkConflicts, checkTokenBudget, checkMissingGlobs].flatMap((rule) =>
		rule(book),
	);
