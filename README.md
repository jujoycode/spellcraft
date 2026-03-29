# spellcraft 🧙‍♂️

**One source. Every agent.**

AI 에이전트(Claude Code, Cursor, Copilot, Windsurf, Cline, Codex)의 컨텍스트 파일을 하나의 원본에서 관리하세요.

```
                   spellcraft.yaml
                        │
                  ┌──────┼──────┐
                  ▼      ▼      ▼
            CLAUDE.md  .cursor/  copilot-instructions.md
                       rules/
```

---

## 왜 spellcraft인가?

AI 에이전트 기반 개발이 일상이 되면서, 에이전트에게 프로젝트 맥락을 전달하는 컨텍스트 파일(`CLAUDE.md`, `.cursorrules`, `copilot-instructions.md` 등)이 코드 품질을 좌우하는 핵심 변수가 되었습니다.

**문제는 이 파일들이 제각각이라는 것입니다.**

- 같은 규칙을 CLAUDE.md, .cursorrules, copilot-instructions.md에 **복붙**하고 있나요?
- 하나를 수정했는데 나머지를 **깜빡 잊고** 방치한 적 있나요?
- "좋은 코드를 작성하세요" 같은 **모호한 규칙**이 얼마나 쓸모있는지 궁금한가요?
- 모노레포에서 루트 규칙과 패키지별 규칙의 **상속 관계**를 머리로 관리하고 있나요?

spellcraft는 이 문제를 해결합니다. 하나의 `spellcraft.yaml`에 규칙을 정의하면, 모든 에이전트의 컨텍스트 파일을 자동으로 생성하고, 품질을 검증하고, 동기화 상태를 관리합니다.

---

## 빠른 시작

### 설치

```bash
npm install -g spellcraft
# 또는
npx spellcraft
```

### 초기화

```bash
npx spellcraft init
```

대화형 프롬프트를 통해 `spellcraft.yaml`이 생성됩니다.

### 주문서 작성

```yaml
# spellcraft.yaml
version: 1

project:
  name: my-project
  description: "Next.js SaaS 프로젝트"

targets:
  - claude
  - cursor
  - copilot

spells:
  - id: lang
    description: "언어 및 프레임워크"
    globs:
      - "**/*.ts"
      - "**/*.tsx"
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
      네이밍은 *.test.ts 패턴을 따른다.

  - id: db
    description: "데이터베이스 규칙"
    targets: [claude]
    alwaysApply: false
    content: |
      Drizzle ORM만 사용한다.
      마이그레이션은 drizzle-kit generate로만 생성한다.
```

### 시전

```bash
npx spellcraft cast

🧙 Casting spells...
✔ CLAUDE.md (3 spells, 1,240 tokens)
✔ .cursor/rules/lang.mdc (1 spell)
✔ .cursor/rules/testing.mdc (1 spell)
✔ .github/copilot-instructions.md (1 spell)
✨ All spells cast successfully.
```

끝. 이제 모든 에이전트가 같은 규칙을 읽습니다.

---

## 명령어

### `cast` — 주문 시전

원본 주문서에서 에이전트별 파일을 생성합니다.

```bash
npx spellcraft cast                  # 모든 타겟에 시전
npx spellcraft cast --target claude  # 특정 타겟만
npx spellcraft cast --dry-run        # 파일 생성 없이 미리보기
```

### `inspect` — 주문서 점검

규칙의 품질을 정적 분석합니다.

```bash
npx spellcraft inspect

🔍 Inspecting spellbook...
⚠ spell:testing — "테스트를 잘 작성하세요"는 너무 모호합니다.
✖ conflict — spell:a("vitest 사용")과 spell:b("jest 사용")이 충돌합니다.
⚠ CLAUDE.md — 토큰 수 12,800 (권장: 10,000 이하)
```

검사 항목:

- **모호성 탐지** — 측정 불가능한 표현 ("잘 작성", "깔끔하게" 등)
- **충돌 탐지** — 같은 주제에 대해 상반되는 규칙
- **토큰 예산** — 에이전트별 권장 컨텍스트 크기 초과 여부
- **globs 누락** — Cursor 대상 주문에 globs가 없는 경우

### `sync` — 동기화

원본과 생성된 파일 간의 차이를 감지합니다.

```bash
npx spellcraft sync --check          # 드리프트 확인만
npx spellcraft sync --apply          # 원본 → 파일 덮어쓰기
npx spellcraft sync --import         # 파일의 수동 편집을 원본에 반영
```

### `tome` — 마법서 (프리셋)

커뮤니티가 만든 규칙 세트를 적용합니다.

```bash
npx spellcraft tome search nextjs    # 프리셋 검색
npx spellcraft tome add @spellcraft/nextjs-app-router  # 적용
npx spellcraft tome remove @spellcraft/nextjs-app-router
```

---

## 지원하는 에이전트

| 에이전트 | 생성 파일 | 비고 |
|---|---|---|
| Claude Code | `CLAUDE.md` | 프로젝트 루트 |
| Cursor | `.cursor/rules/*.mdc` | 주문당 1 파일, MDC frontmatter |
| GitHub Copilot | `.github/copilot-instructions.md` | 단일 파일 |
| Windsurf | `.windsurfrules` | 프로젝트 루트 |
| Cline | `.clinerules` | 프로젝트 루트 |
| Codex | `AGENTS.md` | 프로젝트 루트 |

---

## spellcraft.yaml 스키마

### 프로젝트

```yaml
version: 1                    # 스키마 버전 (현재 1)

project:
  name: my-project             # 프로젝트 이름
  description: "설명"          # 선택

targets:                       # 파일을 생성할 에이전트 목록
  - claude
  - cursor
  - copilot
  - windsurf
  - cline
  - codex
```

### 주문 (Spell)

```yaml
spells:
  - id: unique-id              # 고유 식별자 (필수)
    description: "설명"        # 주문의 목적 (필수)
    content: |                 # 에이전트에게 전달할 내용 (필수)
      구체적인 규칙을 여기에 작성한다.

    # 선택 필드
    targets: [claude, cursor]  # 기본값: 전역 targets 전체
    globs:                     # Cursor MDC의 파일 범위 지정
      - "**/*.ts"
    alwaysApply: true          # Cursor MDC의 자동 적용 여부 (기본: true)
```

### 마법서 (Tome) 참조

```yaml
tomes:
  - "@spellcraft/nextjs-app-router"
  - "@spellcraft/drizzle"
```

### 모노레포 상속

```yaml
# packages/api/spellcraft.yaml
extends: "../../spellcraft.yaml"    # 부모 주문서 경로

spells:
  - id: api-only
    description: "API 전용 규칙"
    content: |
      Hono를 사용한다.

overrides:
  testing:                          # 부모의 testing 주문을 오버라이드
    content: |
      supertest로 API 통합 테스트를 작성한다.
```

병합 우선순위: `tome → root → child` (뒤쪽이 우선)

---

## 모노레포 사용 예시

```
my-monorepo/
├── spellcraft.yaml                # 공통 규칙
├── packages/
│   ├── api/
│   │   └── spellcraft.yaml        # extends: root + API 전용
│   ├── web/
│   │   └── spellcraft.yaml        # extends: root + 프론트 전용
│   └── shared/
│       └── spellcraft.yaml        # extends: root + 공유 라이브러리 전용
```

```bash
# 전체 모노레포의 모든 주문서를 한 번에 시전
npx spellcraft cast --recursive
```

---

## 설계 원칙

spellcraft는 **함수형 Core / 명령형 Edge** 아키텍처를 따릅니다.

- 모든 핵심 로직(파싱, 병합, 검증, 생성, 비교)은 **순수 함수**로 구현되어 있습니다.
- 파일 I/O, 콘솔 출력 등 부수 효과는 CLI 레이어(Edge)에서만 발생합니다.
- 에러는 `throw` 대신 `Result<T, E>` 타입으로 표현합니다.

자세한 아키텍처는 [spellcraft-architecture.md](./docs/spellcraft-architecture.md)를 참고하세요.

---

## 기여하기

기여를 환영합니다! 특히 다음 영역에서 도움이 필요합니다:

- 새로운 에이전트 generator 추가
- 커뮤니티 tome (프리셋) 제작
- inspect 규칙 추가
- 문서 번역 (영어, 일본어 등)

### 개발 환경 설정

```bash
git clone https://github.com/your-username/spellcraft.git
cd spellcraft
pnpm install
pnpm build
pnpm test
```

### 프로젝트 구조

```
spellcraft/
├── packages/
│   ├── core/          # 순수 함수 레이어 (파싱, 병합, 검증, 생성, 비교)
│   ├── generators/    # 에이전트별 파일 생성기
│   ├── cli/           # CLI 인터페이스 (I/O, 커맨드)
│   └── tomes/         # 공식 프리셋
└── docs/              # 설계 문서
```

기여 전에 [CLAUDE.md](./CLAUDE.md)를 읽어주세요. 코딩 컨벤션과 아키텍처 원칙이 정리되어 있습니다.

---

## 용어 사전

| 용어 | 의미 |
|---|---|
| **Spell** (주문) | 하나의 규칙 단위 |
| **Spellbook** (주문서) | `spellcraft.yaml` — 모든 주문의 원본 |
| **Tome** (마법서) | 재사용 가능한 주문 세트 (npm 프리셋) |
| **Cast** (시전) | 원본에서 에이전트별 파일 생성 |
| **Inspect** (점검) | 주문 품질 정적 분석 |
| **Sync** (동기화) | 원본 ↔ 파일 간 드리프트 관리 |
| **Scry** (점술) | 주문 효과 측정 — *coming in v2* |

---

## 로드맵

- [ ] 핵심 기능: cast, inspect, sync, tome
- [ ] `spellcraft.schema.json` — IDE 자동완성
- [ ] `scry` — 주문 효과 A/B 측정 (LLM-as-Judge + 정적 분석)
- [ ] VS Code 확장
- [ ] GitHub Action (`spellcraft/action`)

---

## 라이선스

MIT
