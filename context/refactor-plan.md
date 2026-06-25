# Refactor Plan

## 목적

DevTools Design Analyzer v2의 clean rewrite 진행 순서를 정의한다.

기존 3000줄 단일 파일을 그대로 쪼개지 않는다.  
legacy는 보존하고, v2는 public API와 output contract를 유지한 채 새 구조로 작게 다시 만든다.

## 핵심 원칙

- legacy 파일은 수정하지 않는다.
- public API를 먼저 고정한다.
- output contract를 먼저 유지한다.
- 작은 vertical slice부터 구현한다.
- 한 번에 하나의 Phase만 진행한다.
- 각 Phase 완료 전 runtime check를 실행한다.
- Phase 10은 첫 fixture 확인이 아니라 종합 fixture 비교 단계다.
- role 세부 분리는 안정화 이후 진행한다.

## 전체 Phase

| Phase | 이름 | 목표 |
|---|---|---|
| 1 | Legacy 보존 | 안정 버전 저장 |
| 2 | Public API 연결 | API / `$0` fallback |
| 3 | Minimum Markdown | 필수 섹션 반환 |
| 4 | Core / Context | context / cache / validation |
| 5 | DOM Helper | style / rect / visibility / selector |
| 6 | Selected Element | root 요약 |
| 7 | Child Tree | Annotated Structure |
| 8 | Typography | visible text style |
| 9 | Raw Details | 검증용 원본 정보 |
| 10 | Manual Fixture | Stripe / Vercel / Linear 비교 |
| 11 | Smoke Test | 20~50개 사이트 실행 |
| 12 | Role Split | 안정화 후 role 세부 분리 |
| 13 | Quality Loop | 실패 패턴 기반 개선 |

## Phase 1 — Legacy 보존

작업:

- `legacy/analyzeSelectedElementReadable.stable.js` 저장
- 기존 안정 출력 결과 백업
- Stripe / Vercel / Linear 기준 사이트 선정

완료 기준:

- legacy 파일이 존재한다.
- legacy 파일을 수정하지 않았다.
- 기준 사이트 3개가 기록되었다.

## Phase 2 — Public API 연결

작업:

- `window.DA` namespace 생성
- `window.DA.analyzeSelectedElementReadable` 생성
- `window.analyzeSelectedElementReadable` 연결
- `$0` 안전 fallback 처리
- invalid root 처리

지원 호출:

- `analyzeSelectedElementReadable($0)`
- `analyzeSelectedElementReadable()`
- `analyzeSelectedElementReadable(document.body)`
- `analyzeSelectedElementReadable(document.querySelector("header"))`

규칙:

- 함수 시그니처에서 `root = $0`를 직접 쓰지 않는다.
- `$0`는 함수 내부에서 안전하게 확인한다.
- `index.js`는 public API wiring만 담당한다.

완료 기준:

- public API가 존재한다.
- `$0`가 없어도 ReferenceError가 없다.
- invalid root에 명확한 에러를 제공한다.
- `index.js`에 분석 로직이 없다.

## Phase 3 — Minimum Markdown

작업:

- 최소 report data 생성
- Markdown renderer 연결
- 필수 섹션 출력
- Raw Details placeholder 포함

필수 섹션:

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details><summary>Raw Details</summary>`

완료 기준:

- 반환값이 Markdown string이다.
- 필수 섹션이 모두 존재한다.
- output contract 기본 구조가 깨지지 않는다.

## Phase 4 — Core / Context

작업:

- `analyzerContext` 생성
- 실행 단위 cache 생성
- root validation 정리
- output validation 정리
- partial failure 기본 구조 추가

규칙:

- context는 read-only로 취급한다.
- cache는 한 번의 분석 실행 안에서만 사용한다.
- DOM Element key cache는 기본적으로 `WeakMap`을 사용한다.
- cache 갱신은 helper 내부에서만 한다.
- 전역 cache를 만들지 않는다.

완료 기준:

- context가 분석 실행마다 새로 생성된다.
- context 직접 mutation이 없다.
- 전역 cache가 없다.
- runtime-checklist의 context static check를 통과한다.

## Phase 5 — DOM Helper

작업:

- style helper
- rect helper
- visibility helper
- selector helper
- source path helper
- traversal helper

완료 기준:

- 주요 DOM read가 `context.dom` helper를 통해 수행된다.
- `getComputedStyle` 반복 직접 호출이 없다.
- `getBoundingClientRect` 반복 직접 호출이 없다.
- hidden element 기본 판별이 가능하다.

## Phase 6~9 — 분석 기능

| Phase | 작업 | Quick Check | 완료 기준 |
|---|---|---|---|
| 6 Selected Element | role/tag/selector/text/size/source path | Stripe 또는 Vercel header 1개 | root가 `unknown`만 나오지 않음 |
| 7 Child Tree | visible traversal, role, wrapper, skipped wrapper | Stripe/Vercel/Linear 중 1개 | 주요 구조 표시, hidden menu leak 없음 |
| 8 Typography | visible text style 수집 | nav text + CTA button | Typography 비어 있지 않음, hidden text 제외 |
| 9 Raw Details | raw selector/size/style/source path/skipped wrappers | wrapper 있는 header | `<details>` 안에서 원본 추적 가능 |

## Phase 10 — Manual Fixture

대상:

- Stripe header
- Vercel header
- Linear header

비교 기준:

- 완전 문자열 일치가 목표가 아니다.
- 필수 섹션은 유지되어야 한다.
- 주요 role 의미가 유지되어야 한다.
- hidden / decorative 오염이 없어야 한다.
- Raw Details가 검증용으로 남아야 한다.
- 동적 텍스트 차이만으로 실패 처리하지 않는다.

완료 기준:

- 최소 3개 manual fixture와 비교했다.
- 큰 품질 하락이 없다.
- 차이가 있으면 progress tracker에 기록했다.

## Phase 11 — Smoke Test

작업:

- `fixtures/smoke/sites.json` 작성
- 20~50개 사이트 대상으로 실행
- root element를 명시적으로 전달
- 결과 저장

통과 기준:

- runtime error 없음
- Markdown string 반환
- 필수 섹션 존재
- Markdown 길이 800자 이상
- Markdown 줄 수 20줄 이상
- 주요 role 일부 감지

의심 기준:

- Markdown 길이 800자 미만
- Markdown 줄 수 20줄 미만
- `unknown` 비율 60% 이상

## Phase 12 — Role Split

안정화 이후 role heuristic을 세부 파일로 분리한다.

권장 순서:

1. `roles/actions.js`
2. `roles/navigation.js`
3. `roles/svg.js`
4. `roles/logo.js`

규칙:

- 처음부터 과하게 분리하지 않는다.
- `infer-role.js`가 조율자 역할을 유지한다.
- logo는 오판 가능성이 높으므로 마지막에 분리한다.
- 분리 전후 fixture를 비교한다.

## Phase 13 — Quality Loop

실패 패턴을 보고 heuristic을 개선한다.

대상:

- hidden layer
- decorative SVG
- width behavior
- typography 누락
- wrapper 추적
- role unknown
- logo/nav/button 오판

규칙:

- 한 번에 하나의 heuristic만 수정한다.
- 수정 후 fixture를 다시 확인한다.
- 실패 유형은 progress tracker에 기록한다.

## 하지 않을 것

초기 refactor 단계에서는 다음을 하지 않는다.

- legacy 파일 수정
- 기존 3000줄 파일 분해
- public API 이름 변경
- output format 변경
- Chrome Extension UI 구현
- screenshot 자동화
- hover/focus 분석
- inferRole 선분리
- 1000개 사이트 선테스트
- 실패를 alias로 우회

## 첫 구현 목표

첫 번째 구현 목표는 완성형 분석기가 아니다.

목표:

- `analyzeSelectedElementReadable($0)` 호출
- valid root 확인
- 최소 report data 생성
- 필수 섹션이 있는 Markdown string 반환
- Raw Details placeholder 포함

이 vertical slice가 안정화된 뒤 세부 분석 품질을 하나씩 올린다.