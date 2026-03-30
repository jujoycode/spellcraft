import type { Target } from '@spellcraft/core';
import { claudeGenerator } from './claude.js';
import { clineGenerator } from './cline.js';
import { codexGenerator } from './codex.js';
import { copilotGenerator } from './copilot.js';
import { cursorGenerator } from './cursor.js';
import { windsurfGenerator } from './windsurf.js';
import type { Generator } from './types.js';

export type { Generator, GeneratorOutput } from './types.js';

export { claudeGenerator } from './claude.js';
export { cursorGenerator } from './cursor.js';
export { copilotGenerator } from './copilot.js';
export { windsurfGenerator } from './windsurf.js';
export { clineGenerator } from './cline.js';
export { codexGenerator } from './codex.js';

const generatorRegistry: ReadonlyMap<Target, Generator> = new Map<Target, Generator>([
	['claude', claudeGenerator],
	['cursor', cursorGenerator],
	['copilot', copilotGenerator],
	['windsurf', windsurfGenerator],
	['cline', clineGenerator],
	['codex', codexGenerator],
]);

export const getGenerator = (target: Target): Generator | undefined =>
	generatorRegistry.get(target);

export const getAllGenerators = (): readonly Generator[] => [...generatorRegistry.values()];
