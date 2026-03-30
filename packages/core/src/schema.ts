import * as v from 'valibot';

const TargetSchema = v.picklist(['claude', 'cursor', 'copilot', 'windsurf', 'cline', 'codex']);

const ProjectMetaSchema = v.object({
	name: v.string(),
	description: v.optional(v.string()),
});

const SpellSchema = v.object({
	id: v.string(),
	description: v.pipe(v.string(), v.nonEmpty()),
	content: v.pipe(v.string(), v.nonEmpty()),
	targets: v.optional(v.array(TargetSchema), []),
	globs: v.optional(v.array(v.string()), []),
	alwaysApply: v.optional(v.boolean(), true),
});

const OverrideSchema = v.record(
	v.string(),
	v.partial(
		v.object({
			description: v.string(),
			content: v.string(),
			targets: v.array(TargetSchema),
			globs: v.array(v.string()),
			alwaysApply: v.boolean(),
		}),
	),
);

export const SpellbookSchema = v.object({
	version: v.number(),
	project: ProjectMetaSchema,
	targets: v.array(TargetSchema),
	tomes: v.optional(v.array(v.string()), []),
	spells: v.array(SpellSchema),
	overrides: v.optional(OverrideSchema, {}),
	extends: v.optional(v.string()),
});

export type RawSpellbook = v.InferOutput<typeof SpellbookSchema>;
