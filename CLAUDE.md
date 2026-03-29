# CLAUDE.md — spellcraft 🧙‍♂️

> AI 에이전트 컨텍스트 파일의 통합 관리 CLI 도구.
> 하나의 원본(spellcraft.yaml)에서 CLAUDE.md, .cursor/rules/, copilot-instructions.md 등을 생성한다.

---

## 1. 이 프로젝트가 해결하는 문제

2025년을 기점으로 AI 에이전트(Claude Code, Cursor, Copilot, Windsurf, Cline, Codex)가 코드를 직접 작성하는 시대가 되면서, 에이전트에게 프로젝트 맥락을 전달하는 컨텍스트 파일이 핵심 변수가 되었다.

각 에이전트가 사용하는 컨텍스트 파일:

| 에이전트 | 컨텍스트 파일 | 포맷 |
|---|---|---|
| Claude Code | `CLAUDE.md` | Markdown |
| Cursor | `.cursor/rules/*.mdc` | MDC (YAML frontmatter + Markdown) |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown |
| Windsurf | `.windsurfrules` | Markdown |
| Cline | `.clinerules` | Markdown |
| Codex | `AGENTS.md` | Markdown |

### 4가지 핵심 문제

**Problem 1 — 파편화**: 개발자는 여러 에이전트를 동시에 사용하지만, 각 파일에 들어가는 내용은 70~80% 동일하다. 같은 규칙을 수동으로 복붙하고, 하나를 수정하면 나머지를 잊어버린다.

**Problem 2 — 품질 기준 부재**: "좋은 코드를 작성하세요" 같은 모호한 지시, "Jest 사용" + "Vitest 사용" 같은 충돌, 컨텍스트 윈도우를 낭비하는 과도한 크기 — 이런 문제를 검증할 도구가 없다.

**Problem 3 — 스케일 불가**: 모노레포에서 루트 규칙과 패키지별 규칙의 상속/오버라이드 관계를 사람이 머리로 관리하고 있다. 정합성이 깨져도 감지할 방법이 없다.

**Problem 4 — 재사용 불가**: "Next.js + Drizzle + Vitest" 같은 공통 스택에 최적화된 규칙 세트를 프로젝트 간에 공유할 표준이 없다.

---

## 2. 솔루션: spellcraft가 하는 일

하나의 원본 주문서(spellcraft.yaml)에서 모든 에이전트의 컨텍스트 파일을 생성하고 관리한다.

```
                   spellcraft.yaml
                 (원본 주문서 — Single Source of Truth)
                          │
                    ┌──────┼──────┐
                    ▼      ▼      ▼
              CLAUDE.md  .cursor/  copilot-instructions.md
                         rules/
```

4가지 문제 → 4가지 명령어:

| 문제 | 명령어 | 설명 |
|---|---|---|
| 파편화 | `cast` | 원본 → 에이전트별 파일 시전 |
| 품질 부재 | `inspect` | 주문 품질 정적 분석 (모호성, 충돌, 토큰) |
| 동기화 깨짐 | `sync` | 원본 ↔ 파일 드리프트 감지/동기화 |
| 재사용 불가 | `tome` | 커뮤니티 마법서(프리셋) 관리 |

v2에서 추가 예정:

| 명령어 | 설명 |
|---|---|
| `scry` | 주문 효과 A/B 측정 (LLM-as-Judge + 정적 분석) |

---

## 3. 기술 스택

- 런타임: Node.js >= 20
- 언어: TypeScript 5.x (strict mode)
- 패키지 매니저: pnpm
- 모노레포: pnpm workspaces + turborepo
- 빌드: tsup (ESM only)
- 테스트: vitest
- 린트/포맷: biome

### 핵심 의존성

| 패키지 | 용도 | 선택 이유 |
|---|---|---|
| neverthrow | Result<T, E> 타입 | throw 없는 에러 핸들링. Either 패턴 |
| ts-pattern | 패턴 매칭 | 에러 태그드 유니온 분기 처리 |
| remeda | 파이프라인, 컬렉션 | lodash 대안. pipe 함수, 불변 유틸 |
| valibot | 스키마 검증 | spellcraft.yaml 파싱, unknown → T. tree-shakeable, 번들 사이즈 최소 |
| yaml | YAML 파서 | spellcraft.yaml 읽기/쓰기 |
| commander | CLI 프레임워크 | 커맨드, 옵션, 도움말 |
| chalk | 터미널 컬러 | CLI 출력 포맷팅 |
| diff | 텍스트 비교 | sync 명령어의 드리프트 감지 |

### 채택하지 않은 라이브러리

- **fp-ts**: 유지보수가 사실상 중단되었다 (원저자가 Effect-TS로 이동). HKT, Functor, Monad 등 카테고리 이론 추상화를 TypeScript 위에 올린 구조라 기여자 진입 장벽이 매우 높다.
- **Effect-TS**: fp-ts의 정신적 후계자. 강력하지만 학습 곡선이 가파르고, 프로젝트 전체를 Effect 런타임 위에 올려야 해서 오픈소스 기여자 확보에 불리하다.
- **Zod**: valibot과 동일한 역할이지만, tree-shaking이 되지 않아 번들 사이즈가 크다. CLI 도구의 가벼움을 위해 valibot을 선택한다.

neverthrow + remeda + ts-pattern 조합은 fp-ts/Effect-TS가 제공하는 실용적 가치(Result, pipe, 패턴 매칭)를 거의 다 커버하면서, 일반 TypeScript처럼 읽히는 코드를 유지한다.

---

## 4. 아키텍처 — 함수형 Core / 명령형 Edge

이 프로젝트의 가장 중요한 설계 원칙이다. 반드시 지켜야 한다.

### 설계 원칙

- **순수 함수**: 같은 입력 → 같은 출력. 부수 효과 없음.
- **불변 데이터**: 데이터를 변경하지 않고 새로운 데이터를 반환한다.
- **파이프라인 합성**: 작은 함수를 조합하여 복잡한 로직을 구성한다.
- **부수 효과 격리**: 파일 I/O, 콘솔 출력 등은 파이프라인의 가장자리(edge)에서만 수행한다.
- **타입으로 표현**: 에러, 상태, 분기를 예외가 아닌 타입(Result, Option)으로 표현한다.

### 레이어 분리

```
┌───────────────────────────────────────────┐
│              Edge Layer (cli/)            │
│  파일 읽기 → [순수 파이프라인] → 파일 쓰기  │
│  CLI 입력                      콘솔 출력   │
└─────────────────┬─────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────┐
│           Core Layer (core/) — 순수       │
│                                           │
│  parseSpellbook → mergeSpellbooks         │
│       → inspectAll → castAll → detectDrift │
└───────────────────────────────────────────┘

  ✔ Core는 I/O를 모른다
  ✔ Core만 단독으로 테스트 가능 (모킹 불필요)
  ✔ 에러는 throw하지 않고 Result<T, E>로 반환
```

### 절대 규칙

1. `packages/core/` 안의 모든 함수는 **순수 함수**다.
   - I/O 없음: fs, console, process, fetch 금지
   - 비결정성 없음: Date.now(), Math.random() 금지
   - 예외 없음: throw 대신 `Result<T, E>` 반환
   - 부수 효과 없음: 인자를 변경하지 않고 새 객체 반환

2. `packages/cli/` 는 **Edge Layer**다.
   - 파일 읽기, 콘솔 출력, process.exit 등 모든 부수 효과는 여기서만 발생
   - core 함수를 호출하고 결과를 I/O로 변환하는 얇은 레이어

3. 에러는 **값으로 표현**한다.
   ```typescript
   // ✅ 올바른 패턴
   const result = parseSpellbook(raw);
   result.match(
     book => console.log('성공'),
     error => match(error)
       .with({ _tag: 'SchemaError' }, e => ...)
       .with({ _tag: 'ParseError' }, e => ...)
       .exhaustive()
   );

   // ❌ 금지: throw, try-catch (core 레이어에서)
   ```

4. 데이터는 **불변**이다.
   ```typescript
   // ✅ readonly 사용
   interface Spell {
     readonly id: SpellId;
     readonly content: string;
     readonly targets: readonly Target[];
   }

   // ❌ 금지: mutable 필드
   interface Spell {
     id: string;
     targets: string[];
   }
   ```

5. 합성 가능한 **파이프라인**으로 구성한다.
   ```typescript
   // ✅ pipe로 합성
   import { pipe } from 'remeda';

   const result = pipe(
     rawData,
     parseSpellbook,
     r => r.andThen(resolveTomes),
     r => r.andThen(resolveExtends),
     r => r.map(castAll),
   );

   // ❌ 금지: 중간 변수에 할당하며 명령형으로 나열
   ```

---

## 5. 도메인 용어

코드 전체에서 이 용어를 일관되게 사용한다. 일반 용어(rule, config 등)를 쓰지 않는다.

| 용어 | 의미 | 코드에서 |
|---|---|---|
| Spell (주문) | 하나의 규칙 단위 | `Spell` 인터페이스 |
| Spellbook (주문서) | spellcraft.yaml의 파싱 결과 | `Spellbook` 인터페이스 |
| Tome (마법서) | 재사용 프리셋 (npm 패키지) | `tomes` 필드 |
| Target (대상) | 에이전트 종류 | `Target` 유니온 타입 |
| Cast (시전) | 파일 생성 | `cast` 커맨드, `castAll` 함수 |
| Inspect (점검) | 린팅/검증 | `inspect` 커맨드, `inspectAll` 함수 |
| Sync (동기화) | 드리프트 관리 | `sync` 커맨드, `detectDrift` 함수 |
| Scry (점술) | 효과 측정 (v2) | `scry` 커맨드 |
| Ablation (소거) | 개별 주문 기여도 분석 (v2) | `generateAblationVariants` 함수 |

---

## 6. 핵심 타입 정의

파일을 새로 만들거나 수정할 때 이 타입을 기준으로 한다.

```typescript
// types.ts

type SpellId = string & { readonly _brand: unique symbol };

type Target = 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'cline' | 'codex';

interface ProjectMeta {
  readonly name: string;
  readonly description?: string;
}

interface Spell {
  readonly id: SpellId;
  readonly description: string;
  readonly content: string;
  readonly targets: readonly Target[];
  readonly globs: readonly string[];
  readonly alwaysApply: boolean;
}

interface Spellbook {
  readonly version: number;
  readonly project: ProjectMeta;
  readonly targets: readonly Target[];
  readonly tomes: readonly string[];
  readonly spells: readonly Spell[];
  readonly overrides: Readonly<Record<SpellId, Partial<Spell>>>;
  readonly extends?: string;
}

interface CastOutput {
  readonly target: Target;
  readonly filePath: string;
  readonly content: string;
  readonly tokenCount: number;
  readonly spellsCast: readonly SpellId[];
}

interface Diagnostic {
  readonly severity: 'error' | 'warn' | 'info';
  readonly spellId: SpellId | null;
  readonly code: string;
  readonly message: string;
}

type DriftStatus =
  | { readonly _tag: 'InSync' }
  | { readonly _tag: 'Drifted'; readonly changes: readonly DriftChange[] };

interface DriftChange {
  readonly type: 'added' | 'removed' | 'modified';
  readonly spellId: SpellId | null;
  readonly detail: string;
}

// 에러 — throw하지 않고 Result로 반환
type SpellcraftError =
  | { readonly _tag: 'ParseError';    readonly path: string; readonly message: string }
  | { readonly _tag: 'ConflictError'; readonly spellA: SpellId; readonly spellB: SpellId; readonly reason: string }
  | { readonly _tag: 'FileIOError';   readonly path: string; readonly cause: unknown }
  | { readonly _tag: 'SchemaError';   readonly violations: readonly string[] };
```

---

## 7. 참조 구현 — 각 모듈의 구현 패턴

### 7.1 parser.ts

```typescript
import { ok, err, Result } from 'neverthrow';
import * as v from 'valibot';

const parseSpellbook = (raw: unknown): Result<Spellbook, SpellcraftError> => {
  const parsed = v.safeParse(spellbookSchema, raw);

  if (!parsed.success) {
    return err({
      _tag: 'SchemaError',
      violations: parsed.issues.map(i => i.message),
    });
  }

  return ok(parsed.output);
};
```

### 7.2 merger.ts

```typescript
const mergeSpellbooks = (
  books: readonly Spellbook[]
): Result<Spellbook, SpellcraftError> => {
  return ok(
    books.reduce((acc, book) => ({
      ...acc,
      spells: mergeSpells(acc.spells, book.spells),
      targets: union(acc.targets, book.targets),
      ...applyOverrides(acc.spells, book.overrides),
    }))
  );
};

const mergeSpells = (
  base: readonly Spell[],
  overrides: readonly Spell[]
): readonly Spell[] => {
  const overrideMap = new Map(overrides.map(s => [s.id, s]));
  const merged = base.map(spell =>
    overrideMap.has(spell.id)
      ? { ...spell, ...overrideMap.get(spell.id) }
      : spell
  );
  const newSpells = overrides.filter(s => !base.some(b => b.id === s.id));
  return [...merged, ...newSpells];
};
```

### 7.3 inspector.ts

```typescript
type InspectRule = (book: Spellbook) => readonly Diagnostic[];

const checkConflicts: InspectRule = (book) => {
  const conflicts = findConflictingPairs(book.spells);
  return conflicts.map(([a, b, reason]) => ({
    severity: 'error', spellId: a.id, code: 'CONFLICT',
    message: `"${a.id}"와 "${b.id}"가 충돌합니다: ${reason}`,
  }));
};

const checkVagueness: InspectRule = (book) => {
  const vaguePatterns = ['잘 작성', '깔끔하게', '적절하게', '좋은 코드'];
  return book.spells.flatMap(spell => {
    const found = vaguePatterns.filter(p => spell.content.includes(p));
    return found.map(p => ({
      severity: 'warn', spellId: spell.id, code: 'VAGUE',
      message: `"${p}"은 측정 불가능한 표현입니다. 구체적 기준을 명시하세요.`,
    }));
  });
};

const checkTokenBudget: InspectRule = (book) =>
  book.targets.flatMap(target => {
    const tokens = estimateTokens(castContent(book, target));
    const budget = getTokenBudget(target);
    return tokens > budget
      ? [{ severity: 'warn', spellId: null, code: 'TOKEN_OVER',
           message: `${target}: ${tokens} tokens (권장 ${budget} 이하)` }]
      : [];
  });

const inspectAll: InspectRule = (book) =>
  [checkConflicts, checkVagueness, checkTokenBudget].flatMap(rule => rule(book));
```

### 7.4 caster.ts

```typescript
const castForTarget = (book: Spellbook, target: Target): CastOutput => {
  const applicable = book.spells.filter(s => s.targets.includes(target));
  const content = formatForTarget(target, applicable);
  return {
    target, filePath: getOutputPath(target), content,
    tokenCount: estimateTokens(content),
    spellsCast: applicable.map(s => s.id),
  };
};

const castAll = (book: Spellbook): readonly CastOutput[] =>
  book.targets.map(target => castForTarget(book, target));
```

### 7.5 differ.ts

```typescript
const detectDrift = (expected: CastOutput, actual: string): DriftStatus => {
  if (expected.content === actual) return { _tag: 'InSync' };
  const changes = diffLines(expected.content, actual);
  return { _tag: 'Drifted', changes: classifyChanges(changes) };
};
```

### 7.6 CLI Edge Layer — cast 커맨드

```typescript
import { pipe } from 'remeda';

const castCommand = async (configPath: string): Promise<void> => {
  const rawYaml = await readFile(configPath, 'utf-8');
  const rawData = yaml.parse(rawYaml);

  const result = pipe(
    rawData,
    parseSpellbook,
    r => r.andThen(resolveTomes),
    r => r.andThen(resolveExtends),
    r => r.map(castAll),
  );

  result.match(
    outputs => outputs.forEach(o => writeFileSync(o.filePath, o.content)),
    error => match(error)
      .with({ _tag: 'ParseError' },    e => console.error(`파싱 실패: ${e.message}`))
      .with({ _tag: 'SchemaError' },   e => console.error(`스키마 오류:\n${e.violations.join('\n')}`))
      .with({ _tag: 'ConflictError' }, e => console.error(`충돌: ${e.reason}`))
      .exhaustive()
  );
};
```

---

## 8. spellcraft.yaml 입력 포맷

```yaml
version: 1

project:
  name: my-saas
  description: "B2B SaaS 플랫폼"

targets:
  - claude
  - cursor
  - copilot

tomes:
  - "@spellcraft/nextjs-app-router"

spells:
  - id: lang
    description: "언어 및 프레임워크"
    globs: ["**/*.ts", "**/*.tsx"]
    content: |
      TypeScript strict 모드를 사용한다.
      any 타입 사용을 금지한다.
      unknown을 사용하고 타입 가드로 좁힌다.

  - id: testing
    description: "테스트 컨벤션"
    targets: [claude, cursor]
    content: |
      vitest를 사용한다.
      테스트 파일은 __tests__/ 디렉토리에 위치한다.

  - id: db
    description: "데이터베이스 규칙"
    targets: [claude]
    alwaysApply: false
    content: |
      Drizzle ORM만 사용한다.
      마이그레이션은 drizzle-kit generate로만 생성한다.
```

### 모노레포 상속

```yaml
# packages/api/spellcraft.yaml
extends: "../../spellcraft.yaml"

spells:
  - id: api-framework
    content: "Hono를 사용한다."
    targets: [claude, cursor]

overrides:
  testing:
    content: |
      supertest를 사용하여 API 통합 테스트를 작성한다.
```

상속 체인: `tome → root → package` 순서로 병합되며, 뒤쪽이 우선한다.

---

## 9. 에이전트별 출력 포맷 명세

### Claude Code → CLAUDE.md

```markdown
# Project: {project.name}

{project.description}

## {spell.description}

{spell.content}
```

### Cursor → .cursor/rules/*.mdc

주문 하나당 `.mdc` 파일 하나. YAML frontmatter 포함.
```markdown
---
description: {spell.description}
globs: {spell.globs}
alwaysApply: {spell.alwaysApply}
---

{spell.content}
```

### GitHub Copilot → .github/copilot-instructions.md

하나의 Markdown 파일. 구조는 Claude와 유사하나 경로가 `.github/` 하위.

### Windsurf → .windsurfrules / Cline → .clinerules / Codex → AGENTS.md

각각 하나의 Markdown 파일. 루트 디렉토리.

---

## 10. 프로젝트 구조

```
spellcraft/
├── CLAUDE.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── tsconfig.base.json
│
├── packages/
│   ├── core/                        # 순수 함수 레이어
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts             # 퍼블릭 API (re-export)
│   │   │   ├── types.ts             # 도메인 모델, 에러 타입
│   │   │   ├── schema.ts            # Valibot 스키마
│   │   │   ├── parser.ts            # YAML → Result<Spellbook>
│   │   │   ├── merger.ts            # 상속 체인 병합
│   │   │   ├── inspector.ts         # 주문 검증
│   │   │   ├── caster.ts            # Spellbook → CastOutput[]
│   │   │   ├── differ.ts            # 드리프트 감지
│   │   │   └── tokens.ts            # 토큰 수 추정
│   │   └── __tests__/
│   │       ├── parser.test.ts
│   │       ├── merger.test.ts
│   │       ├── inspector.test.ts
│   │       ├── caster.test.ts
│   │       ├── differ.test.ts
│   │       └── fixtures/
│   │
│   ├── generators/                  # 에이전트별 포맷 변환기
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts             # Generator 인터페이스
│   │   │   ├── claude.ts
│   │   │   ├── cursor.ts
│   │   │   ├── copilot.ts
│   │   │   ├── windsurf.ts
│   │   │   ├── cline.ts
│   │   │   └── codex.ts
│   │   └── __tests__/
│   │
│   └── cli/                         # Edge Layer
│       ├── package.json
│       ├── src/
│       │   ├── index.ts             # #!/usr/bin/env node
│       │   ├── commands/
│       │   │   ├── cast.ts
│       │   │   ├── inspect.ts
│       │   │   ├── sync.ts
│       │   │   ├── tome.ts
│       │   │   └── init.ts
│       │   ├── io.ts
│       │   └── logger.ts
│       └── __tests__/e2e/
│
├── fixtures/
│   ├── basic-project/
│   └── monorepo-project/
│
└── docs/
    └── scry-design.md               # v2 성능 측정 설계
```

---

## 11. 테스트 전략

### Core — 모킹 금지, 입력-출력만 검증

```typescript
describe('mergeSpells', () => {
  it('같은 id의 주문은 뒤쪽이 우선한다', () => {
    const base  = [{ id: 'test', content: 'jest 사용', targets: ['claude'] }] as const;
    const child = [{ id: 'test', content: 'vitest 사용', targets: ['claude'] }] as const;
    expect(mergeSpells(base, child)).toEqual([
      { id: 'test', content: 'vitest 사용', targets: ['claude'] }
    ]);
  });
});
```

### Property-based (fast-check)

```typescript
describe('castForTarget', () => {
  it('출력에는 해당 target의 주문만 포함된다', () => {
    fc.assert(fc.property(arbitrarySpellbook(), (book) => {
      const output = castForTarget(book, 'claude');
      const expected = book.spells.filter(s => s.targets.includes('claude')).map(s => s.id);
      expect(output.spellsCast).toEqual(expected);
    }));
  });
});
```

### CLI 통합 테스트

fixtures 디렉토리의 샘플 프로젝트에서 실제 파일 I/O를 수행한다.

---

## 12. 코딩 컨벤션

### 함수 작성

- 함수는 하나의 일만 한다. 10줄 이하를 권장한다.
- 함수명은 동사로 시작한다: `parseSpellbook`, `mergeSpells`, `detectDrift`
- 검증/변환 함수는 `Result<T, E>`를 반환한다.
- 조건 분기는 `ts-pattern`의 `match`를 사용한다. `if-else` 체인 금지.

### 컬렉션 처리

- `for`, `while` 루프 금지. `map`, `filter`, `reduce`, `flatMap`만 사용.
- 복잡한 변환은 `remeda`의 `pipe`로 합성한다.
- 배열 변경(push, splice) 금지. 스프레드(`[...arr, item]`)로 새 배열 생성.

### 네이밍

- 파일명: kebab-case (`spell-parser.ts`)
- 타입/인터페이스: PascalCase (`Spellbook`, `CastOutput`)
- 함수/변수: camelCase (`parseSpellbook`, `castAll`)
- 상수: UPPER_SNAKE_CASE (`DEFAULT_TOKEN_BUDGET`)

### import

- 상대 경로 사용 (`./types`, `../merger`)
- barrel export는 `index.ts`에서만
- 타입 import는 `import type`으로 분리

### 테스트 파일

- 파일명: `{모듈명}.test.ts`
- core 테스트에는 모킹 금지
- `describe`로 함수별 그룹핑, `it`은 행동을 한국어로 서술

---

## 13. 커맨드 사전

```bash
pnpm install                                    # 의존성 설치
pnpm build                                      # turbo run build
pnpm test                                       # turbo run test
pnpm --filter @spellcraft/core test             # 특정 패키지 테스트
pnpm --filter @spellcraft/core test -- --watch  # 워치 모드
pnpm lint                                       # biome check .
pnpm format                                     # biome format --write .
pnpm --filter @spellcraft/cli dev -- cast       # CLI 로컬 실행
```

---

## 14. 작업 순서 — MVP (v0.1)

아래 순서대로 구현한다. 각 단계는 이전 단계에 의존한다.

### Phase 1: scaffold

pnpm workspace + turborepo + tsconfig.base.json + biome.json + packages 초기화 + tsup + vitest 설정.
완료 기준: `pnpm build && pnpm test` 에러 없이 통과.

### Phase 2: Core — 파서 + 스키마

types.ts → schema.ts (Valibot) → parser.ts → tokens.ts + 테스트.
완료 기준: YAML → Spellbook 파싱 성공, 잘못된 YAML → SchemaError.

### Phase 3: Core — 병합기

merger.ts (mergeSpells, mergeSpellbooks) + extends/overrides + 테스트.
완료 기준: root + child YAML 병합 동작.

### Phase 4: Generators

Generator 인터페이스 → claude.ts, cursor.ts, copilot.ts, windsurf.ts, cline.ts, codex.ts + 테스트.
완료 기준: 모든 타겟에서 파일 생성 동작.

### Phase 5: Core — Caster + Inspector

caster.ts (castForTarget, castAll) + inspector.ts (checkVagueness, checkConflicts, checkTokenBudget, checkMissingGlobs) + 테스트.
완료 기준: Diagnostic[] 반환.

### Phase 6: Core — Differ

differ.ts (detectDrift) + 테스트.
완료 기준: 드리프트 감지 동작.

### Phase 7: CLI

commander 설정 → cast, inspect, sync, init 커맨드 → logger.ts, io.ts → E2E 테스트.
완료 기준: `npx spellcraft cast`, `inspect`, `sync --check` 동작.

### Phase 8: 마무리

spellcraft.schema.json + README.md + npm publish 설정 + GitHub Actions CI.

---

## 15. v2 로드맵 — scry (주문 효과 측정)

같은 프롬프트를 "주문 있음" vs "주문 없음"으로 에이전트에 보내고 결과를 비교한다.

```
Test Suite → with spells → 응답 A ─┐
           → without spells → 응답 B ─┤→ 평가기 → 점수 비교 리포트
```

이중 평가: LLM-as-Judge (순수 함수로 프롬프트 구성) + 정적 분석 (any 카운트, 에러 핸들링 여부, 금지 패키지).
Ablation: 주문을 하나씩 빼면서 개별 기여도 분석.
CI 연동: PR에서 spellcraft.yaml 변경 시 자동 scry → 품질 게이트.

---

## 16. 작업 시 주의사항

- core에 코드를 추가할 때마다 "이 함수가 순수한가?" 자문한다. fs, console, Date, Math.random이 있으면 안 된다.
- 새 함수를 만들면 반드시 테스트를 함께 작성한다. core는 모킹 없이 입출력만 검증.
- 에러가 발생할 수 있는 모든 지점에서 `Result<T, E>`를 반환한다. `throw` 금지 (core 내).
- 타입에 `readonly`를 빠뜨리지 않는다. 인터페이스 필드, 배열, Record 모두.
- YAML 필드명은 camelCase (`alwaysApply`), 도메인 용어는 spellcraft 세계관 (`spell`, `tome`).
- generator는 플러그인처럼 독립적이다. 새 에이전트 추가 시 generator 하나만 추가하면 된다.
- CLI 이모지: 🧙 cast, 🔍 inspect, 🔄 sync, 📚 tome, 🔮 scry, ✔ 성공, ✖ 에러, ⚠ 경고, ℹ 정보.
- 커밋: conventional commits (`feat(core):`, `fix(cli):`, `test(core):`, `docs:`)
