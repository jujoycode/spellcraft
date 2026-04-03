import Anthropic from '@anthropic-ai/sdk';
import { type Result, err, ok } from 'neverthrow';
import type { SpellcraftError } from '@spellcraft/core';
import type { ScryProviderConfig } from './types.js';

export interface ClaudeClient {
	readonly call: (
		system: string,
		user: string,
	) => Promise<Result<string, SpellcraftError>>;
}

/** Create a Claude API client with given provider config */
export const createClaudeClient = (
	config: ScryProviderConfig,
	apiKey?: string,
): Result<ClaudeClient, SpellcraftError> => {
	const key = apiKey ?? process.env['ANTHROPIC_API_KEY'];

	if (!key) {
		return err({
			_tag: 'ConfigError',
			key: 'ANTHROPIC_API_KEY',
			message: 'ANTHROPIC_API_KEY environment variable is not set',
		});
	}

	const client = new Anthropic({ apiKey: key });

	return ok({
		call: async (system: string, user: string): Promise<Result<string, SpellcraftError>> => {
			try {
				const response = await client.messages.create({
					model: config.model,
					max_tokens: config.maxTokens,
					...(system ? { system } : {}),
					messages: [{ role: 'user', content: user }],
				});

				const textBlock = response.content.find((block) => block.type === 'text');
				const text = textBlock && 'text' in textBlock ? textBlock.text : '';

				return ok(stripCodeFences(text));
			} catch (cause) {
				return err({
					_tag: 'FileIOError',
					path: 'anthropic-api',
					cause: cause instanceof Error ? cause.message : String(cause),
				});
			}
		},
	});
};

/** Strip markdown code fences if present */
const stripCodeFences = (text: string): string => {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```(?:\w+)?\n([\s\S]*?)```$/);
	return fenceMatch ? fenceMatch[1]!.trim() : trimmed;
};
