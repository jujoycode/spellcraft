import { resolve } from 'node:path';
import { writeOutput } from '../io.js';
import { logger } from '../logger.js';

const DEFAULT_SPELL_YML = `version: 1

project:
  name: my-project
  description: ""

targets:
  - claude
  - cursor
  - copilot

tomes: []

spells:
  - id: lang
    description: "언어 및 프레임워크"
    content: |
      TypeScript strict 모드를 사용한다.
      any 타입 사용을 금지한다.

  - id: testing
    description: "테스트 컨벤션"
    targets: [claude, cursor]
    content: |
      vitest를 사용한다.
`;

export const initCommand = async (dir: string = '.'): Promise<void> => {
	const outputPath = resolve(dir, 'spell.yml');
	const result = await writeOutput(outputPath, DEFAULT_SPELL_YML);

	if (result.isErr()) {
		logger.error(`Failed to create spell.yml: ${String(result.error.cause)}`);
		process.exitCode = 1;
		return;
	}

	logger.success(`Created ${outputPath}`);
	logger.info('Edit spell.yml, then run: spellcraft cast');
};
