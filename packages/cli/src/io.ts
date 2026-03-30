import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Result, err, ok } from 'neverthrow';
import { parse } from 'yaml';
import type { SpellcraftError } from '@spellcraft/core';

export const readYaml = async (path: string): Promise<Result<unknown, SpellcraftError>> => {
	try {
		const content = await readFile(path, 'utf-8');
		return ok(parse(content));
	} catch (cause) {
		return err({ _tag: 'FileIOError', path, cause });
	}
};

export const writeOutput = async (
	filePath: string,
	content: string,
): Promise<Result<void, SpellcraftError>> => {
	try {
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, content, 'utf-8');
		return ok(undefined);
	} catch (cause) {
		return err({ _tag: 'FileIOError', path: filePath, cause });
	}
};

export const readFileContent = async (
	path: string,
): Promise<Result<string, SpellcraftError>> => {
	try {
		const content = await readFile(path, 'utf-8');
		return ok(content);
	} catch (cause) {
		return err({ _tag: 'FileIOError', path, cause });
	}
};
