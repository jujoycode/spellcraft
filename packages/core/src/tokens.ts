const TOKEN_RATIO = 1.3;

/** Estimate token count from content string (word-based approximation) */
export const estimateTokens = (content: string): number => {
	const words = content.split(/\s+/).filter((w) => w.length > 0);
	return Math.ceil(words.length * TOKEN_RATIO);
};
