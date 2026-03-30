import type { ScryTask } from './types.js';

export interface PromptPair {
	readonly system: string;
	readonly user: string;
}

/** Build prompt with spells (cast output as system prompt) */
export const buildWithSpellsPrompt = (
	castContent: string,
	task: ScryTask,
): PromptPair => ({
	system: castContent,
	user: buildUserPrompt(task),
});

/** Build prompt without spells (empty system prompt) */
export const buildWithoutSpellsPrompt = (task: ScryTask): PromptPair => ({
	system: '',
	user: buildUserPrompt(task),
});

const buildUserPrompt = (task: ScryTask): string =>
	[
		task.prompt,
		'',
		'Return ONLY the TypeScript code, no explanations or markdown fences.',
	].join('\n');
