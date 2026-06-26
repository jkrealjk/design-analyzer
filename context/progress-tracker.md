# Progress Tracker

## 목적

DevTools Design Analyzer v2의 현재 상태, 다음 작업, 결정 사항, runtime check, fixture 결과, 실패 유형을 추적한다.

상세 기준은 아래 문서를 따른다.

- `context/refactor-plan.md`
- `context/runtime-checklist.md`
- `context/fixture-plan.md`
- `context/code-standards.md`

## Current Snapshot

```txt
Project: DevTools Design Analyzer v2
Mode: Clean rewrite
Legacy: Reference only
Current Phase: v0.2.3 SVG / Decorative Node Cleanup 구현 완료, Chrome DevTools 확인 대기
Next Phase: v0.2.3 SVG / Decorative Node Cleanup Chrome DevTools 확인
Status: v0.1.0 Stable, v0.2.3 Implemented / Chrome Pending
```

## Phase Status

| Phase | 이름 | 상태 | 메모 |
|---|---|---|---|
| 1 | Legacy 보존 | Done | `legacy/analyzeSelectedElementReadable.stable.js` 존재 확인 |
| 2 | Public API 연결 | Done | `window.DA`, public API, `$0` fallback 구현 |
| 3 | Minimum Markdown | Done | 필수 섹션과 Raw Details placeholder 출력 |
| 4 | Core / Context | Done | analyzerContext / roleContext / 실행 단위 cache / output validation |
| 5 | DOM Helper | Done | style / rect / visibility / selector / source path |
| 6 | Selected Element | Done | Chrome DevTools 확인 완료 |
| 7 | Child Tree | Done | Chrome DevTools 확인 완료 |
| 8 | Typography | Done | Chrome DevTools 확인 완료 |
| 9 | Raw Details | Done | Chrome DevTools 확인 완료 |
| 10 | Manual Fixture | Done | 사용자 확인: Chrome DevTools에서 `fixtures/manual/header-basic.html` 확인 완료 |
| 11 | Smoke Test | Done | `node scripts/smoke-test.js` 통과 |
| 12 | Role Split | Done | 사용자 확인: Chrome DevTools에서 role split 확인 완료 |
| 13 | Quality Loop | Implemented / Chrome Pending | text / selector / typography readability 개선, smoke 통과 |
| 14 | v0.2.0 Report Formatting Upgrade | Implemented / Chrome Pending | renderer 중심 Markdown 품질 개선, smoke 통과 |
| 15 | v0.2.1 Child Tree Readability Upgrade | Implemented / Chrome Pending | wrapper flattening, role/readability label 개선, smoke 통과 |
| 16 | v0.2.2 Tree Label Polish | Implemented / Chrome Pending | `Action Group (span)` 방지, 단일 text span wrapper 단순화, selector class dedupe, smoke 통과 |
| 17 | v0.2.3 SVG / Decorative Node Cleanup | Implemented / Chrome Pending | SVG 내부 shape 노드 숨김, SVG root 보존, smoke 통과 |

## Docs Status

| 문서 | 상태 |
|---|---|
| `AGENTS.md` | Done |
| `context/project-overview.md` | Done |
| `context/output-contract.md` | Done |
| `context/public-api.md` | Done |
| `context/fixture-plan.md` | Done |
| `context/architecture.md` | Done |
| `context/module-map.md` | Done |
| `context/code-standards.md` | Done |
| `context/refactor-plan.md` | Done |
| `context/runtime-checklist.md` | Done |
| `context/progress-tracker.md` | Done |

## Decisions

- 기존 3000줄 단일 JS 파일은 직접 쪼개지 않는다.
- v2는 clean rewrite로 진행한다.
- legacy 파일은 수정하지 않는다.
- legacy는 oracle / reference / fixture 기준으로만 사용한다.
- public API는 유지한다.
- output contract는 유지한다.
- 초기 목표는 완성형 분석기가 아니라 vertical slice다.
- Phase 10은 첫 fixture 확인이 아니라 종합 fixture 비교 단계다.
- 각 Phase 완료 전 최소 quick runtime check를 실행한다.
- context는 read-only로 취급한다.
- DOM Element key cache는 기본적으로 `WeakMap`을 사용한다.
- `$0`는 안전 fallback으로만 처리한다.
- 자동 테스트에서는 `$0`에 의존하지 않는다.

## Contracts

Public API:

```txt
analyzeSelectedElementReadable(root = $0)
```

구현 시 `root = $0` 기본값을 직접 쓰지 않는다.

필수 output section:

```txt
## Selected Element
## Child Elements — Annotated Structure
## Typography
<details><summary>Raw Details</summary>
```

## Next Actions

현재 바로 해야 할 작업만 기록한다.

```txt
1. Chrome에서 Linear header 또는 `fixtures/manual/header-basic.html` 열기
2. 최신 `dist/analyzer.dev.js`를 Snippet으로 로드
3. Elements 패널에서 header 요소 선택
4. `const result = analyzeSelectedElementReadable($0);` 실행
5. Child Elements에 `Element (path)`, `Element (rect)`, `Element (circle)`이 없는지 확인
6. `Logo Link`, `Logo (svg)` 또는 `Icon (svg)` 같은 의미 노드가 유지되는지 확인
7. `Button`, `Link`, `Product`, `Sign up` 같은 실제 UI 요소가 유지되는지 확인
8. 확인 결과를 progress tracker에 기록
```

## v0.2.3 SVG / Decorative Node Cleanup

구현 결과:

- `src/collect/child-tree.js`에서 SVG 내부 shape / definition 태그를 Child Elements에서 제외했다.
- 제외 대상은 `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `g`, `defs`, `clipPath`, `mask`, `use`, `linearGradient`, `radialGradient`, `stop`이다.
- SVG root 자체는 기존 child tree 수집 흐름에 남겨 `Logo (svg)` / `Icon (svg)` / `Asset (svg)`로 표시될 수 있게 유지했다.
- `fixtures/manual/header-basic.html`에 작은 inline logo SVG 회귀 케이스를 추가했다.
- `scripts/smoke-test.js`에서 `Logo (svg)` 보존과 `Element (path)` 누락을 확인한다.
- `dist/analyzer.dev.js`를 재생성했다.

확인 결과:

- `node scripts/concat-dev.js`: Pass
- `node scripts/smoke-test.js`: Pass
- context mutation static check 3종: Pass
- DOM read static check: Pass, DOM 직접 read는 validation / `src/dom/helpers.js` / smoke harness에 한정
- Chrome DevTools manual confirmation: Pending

알려진 제한:

- width behavior inference는 아직 구현하지 않았다.
- content-fit / parent-fill inference는 아직 구현하지 않았다.
- height source trace는 아직 구현하지 않았다.

## v0.2.2 Tree Label Polish

구현 결과:

- `src/roles/infer-role.js`에서 `span`은 action evidence가 있어도 `Action Group`으로 판정하지 않게 했다.
- `src/collect/child-tree.js`에서 단일 text span wrapper를 Child Elements에서 보수적으로 생략한다.
- 생략 대상 span은 유용한 role / aria-label이 없고, 직접 text만 있거나 보존해야 하는 link/button/asset child 하나만 감싸는 경우로 제한했다.
- link / button / logo / icon / asset leaf는 계속 보존한다.
- `src/dom/helpers.js`에서 concise selector와 source selector class name 중복을 제거했다.
- smoke fixture에 중복 class가 있는 `fixture-buttonItem` span wrapper를 추가해 `Action Group (span)` 회귀와 selector dedupe를 확인한다.
- `dist/analyzer.dev.js`를 재생성했다.

확인 결과:

- `node scripts/concat-dev.js`: Pass
- `node scripts/smoke-test.js`: Pass
- context mutation static check 3종: Pass
- DOM read static check: Pass, DOM 직접 read는 validation / `src/dom/helpers.js`에 한정
- Chrome DevTools manual confirmation: Pending

알려진 제한:

- width behavior inference는 아직 구현하지 않았다.
- content-fit / parent-fill inference는 아직 구현하지 않았다.
- height source trace는 아직 구현하지 않았다.

## v0.2.1 Child Tree Readability Upgrade

구현 결과:

- `src/collect/child-tree.js`에 보수적인 wrapper flattening을 추가했다.
- child tree traversal depth를 늘려 실제 header의 의미 있는 descendant까지 도달하도록 했다.
- tiny layout-only spacer `div` / `span`은 유용한 text와 meaningful descendants가 없을 때 Child Elements에서 제외한다.
- `src/roles/infer-role.js`에 `Logo Link`, `Nav Group`, `Action Group`, `Icon` 등 보수적인 readability label을 추가했다.
- action / navigation / logo evidence 판정을 보수적으로 보강했다.
- `scripts/smoke-test.js`가 fenced text tree와 의미 노드 포함 여부를 확인한다.
- `dist/analyzer.dev.js`를 재생성했다.

확인 결과:

- `node scripts/concat-dev.js`: Pass
- `node scripts/smoke-test.js`: Pass
- context mutation static check 3종: Pass
- DOM read static check: Pass, DOM 직접 read는 validation / `src/dom/helpers.js`에 한정
- Chrome DevTools manual confirmation: Pending

알려진 제한:

- width behavior inference는 아직 구현하지 않았다.
- content-fit / parent-fill inference는 아직 구현하지 않았다.
- height source trace는 아직 구현하지 않았다.
- logo / CTA heuristic은 여전히 보수적으로 유지한다.

## Check Summary

| 구분 | 최소 확인 |
|---|---|
| Public API | `window.DA`, `window.analyzeSelectedElementReadable` 존재 |
| `$0` fallback | `$0` 없어도 ReferenceError 없음 |
| Invalid root | 명확한 에러 메시지 |
| Output | Markdown string + 필수 섹션 |
| Context | direct mutation 없음 |
| Cache | DOM Element key는 `WeakMap` |
| DOM read | `context.dom` helper 경유 |
| Fixture | Phase별 최소 1개 quick check |
| Smoke | 800자 이상, 20줄 이상, 필수 섹션 존재 |

## Context Static Check

Phase 4 완료 전 context mutation 의심 패턴을 확인한다.

```bash
CODE_DIR=src

grep -RIn "context\.[a-zA-Z0-9_]*\s*=" "$CODE_DIR"
grep -RIn "context\.[a-zA-Z0-9_]*\.[a-zA-Z0-9_]*\s*=" "$CODE_DIR"
grep -RIn "context\.cache\s*=" "$CODE_DIR"
```

메모:

- `CODE_DIR`은 실제 프로젝트 구조에 맞게 조정한다.
- 검색 결과가 없더라도 경로가 맞는지 먼저 확인한다.
- cache 갱신은 정해진 helper 내부에서만 한다.

## Phase Quick Checks

| Phase | Quick Check | 실패 기준 |
|---|---|---|
| 2 | API 호출 3종 확인 | ReferenceError, invalid root crash |
| 3 | 필수 Markdown 섹션 확인 | missing section |
| 4 | context/cache 정적 확인 | direct mutation, global cache |
| 5 | DOM helper 경유 확인 | DOM read 반복 직접 호출 |
| 6 | Stripe/Vercel header 1개 | root가 `unknown`만 나옴 |
| 7 | Header 구조 확인 | DOM dump, hidden menu leak |
| 8 | nav/CTA text 확인 | hidden text 섞임 |
| 9 | Source Path 확인 | Raw Details 추적 불가 |
| 10 | 3개 manual fixture | 큰 품질 하락 |
| 11 | 20~50개 smoke | runtime error, section missing |

## Manual Fixtures

| 사이트 | 대상 | 상태 | 메모 |
|---|---|---|---|
| Stripe | Header | Pending | - |
| Vercel | Header | Pending | - |
| Linear | Header | Pending | - |

## Smoke Test Thresholds

초기 통과 기준:

- runtime error 없음
- Markdown string 반환
- 필수 섹션 존재
- Markdown 길이 800자 이상
- Markdown 줄 수 20줄 이상
- 주요 role 일부 감지

초기 의심 기준:

- Markdown 길이 800자 미만
- Markdown 줄 수 20줄 미만
- `unknown` 비율 60% 이상

초기 실패 기준:

- 필수 섹션 누락
- 주요 role이 하나도 없음
- raw stack trace만 반환
- console runtime error 발생

## Failure Types

```txt
runtime-error
missing-section
empty-output
invalid-root
role-unknown
logo-detection
nav-detection
button-link-detection
hidden-layer-leak
decorative-svg-leak
typography-missing
wrapper-trace-missing
raw-details-missing
dynamic-text-diff
```

## Failure Log

| 날짜 | Phase | 유형 | 증상 | 원인 | 처리 |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## Runtime Check Log

| 날짜 | Phase | 대상/명령 | 결과 | 메모 |
|---|---|---|---|---|
| 2026-06-25 | 2-3 | `node scripts/concat-dev.js` | Pass | `dist/analyzer.dev.js` 생성 |
| 2026-06-25 | 2 | Node quick check: namespace/public API/invalid root | Pass | `$0` 없음 환경에서 ReferenceError 없음, 명확한 root 에러 확인 |
| 2026-06-25 | 2 | Node quick check: `$0` fallback | Pass | 인자 생략 시 안전 fallback 확인 |
| 2026-06-25 | 3 | Node quick check: Markdown 필수 섹션 | Pass | Markdown string 및 필수 섹션 확인 |
| 2026-06-25 | 4 | `node scripts/concat-dev.js` | Pass | `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 4 | Context static check 3종 grep | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 4 | Node quick check: runtime/context/cache/output validation | Pass | context/cache 실행별 생성, Element cache WeakMap 확인 |
| 2026-06-25 | 4 | Node quick check: no-arg / `$0` fallback | Pass | `$0` 없음 clear error, `$0` 존재 시 Markdown string 반환 |
| 2026-06-25 | 5 | `node scripts/concat-dev.js` | Pass | DOM helper 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 5 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 5 | DOM read static check `rg` | Pass | `getComputedStyle` / `getBoundingClientRect` 직접 호출은 `src/dom/helpers.js`에만 존재 |
| 2026-06-25 | 5 | Node quick check: DOM helper/cache/runtime/output | Pass | DOM API 존재, style/rect cache, visibility, selector/source path, 필수 섹션 확인 |
| 2026-06-25 | 5 | Phase 5 DevTools exposure fix | Pass | `Object.keys(DA.dom)`에 DOM helper 7종 등록 확인 |
| 2026-06-25 | 6 | `node scripts/concat-dev.js` | Pass | selected element collector 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 6 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 6 | DOM read static check `rg` | Pass | `getComputedStyle` / `getBoundingClientRect` 직접 호출은 `src/dom/helpers.js`에만 존재 |
| 2026-06-25 | 6 | Node quick check: runtime/selected/output | Pass | Header role/tag/selector/text/size/visibility/source path 및 필수 섹션 확인 |
| 2026-06-25 | 6 | Chrome DevTools manual check | Pending | 터미널 환경에서는 직접 확인 불가, 수동 확인 필요 |
| 2026-06-25 | 7 | `node scripts/concat-dev.js` | Pass | child tree collector 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 7 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 7 | DOM read static check `rg` | Pass | `getComputedStyle` / `getBoundingClientRect` 직접 호출은 `src/dom/helpers.js`에만 존재 |
| 2026-06-25 | 7 | Node quick check: runtime/child-tree/output | Pass | placeholder 제거, nested child tree 출력, script/hidden node 제외 확인 |
| 2026-06-25 | 7 | Chrome DevTools manual check | Pending | 터미널 환경에서는 직접 확인 불가, 수동 확인 필요 |
| 2026-06-25 | 8 | `node scripts/concat-dev.js` | Pass | typography collector 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 8 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 8 | DOM read static check `rg` | Pass | `getComputedStyle` / `getBoundingClientRect` 직접 호출은 `src/dom/helpers.js`에만 존재 |
| 2026-06-25 | 8 | Node quick check: runtime/typography/output | Pass | 필수 섹션 유지, Typography placeholder 제거, visible text style 출력, script/hidden text 제외 확인 |
| 2026-06-25 | 8 | Chrome DevTools manual check | Pass | 사용자 확인: Phase 8 Typography Chrome DevTools 확인 완료 |
| 2026-06-25 | 9 | `node scripts/concat-dev.js` | Pass | raw details collector 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-25 | 9 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-25 | 9 | DOM read static check `rg` | Pass | `getComputedStyle` / `getBoundingClientRect` 직접 호출은 `src/dom/helpers.js`에만 존재 |
| 2026-06-25 | 9 | Node quick check: runtime/raw-details/output | Pass | 필수 섹션 유지, Raw Details placeholder 제거, selector/source path/rect/layout/spacing 출력 확인 |
| 2026-06-25 | 9 | Chrome DevTools manual check | Pass | 사용자 확인: Phase 9 Raw Details Chrome DevTools 확인 완료 |
| 2026-06-25 | 10 | Manual fixture file creation | Pass | `fixtures/manual/header-basic.html`, `fixtures/manual/README.md` 추가 |
| 2026-06-25 | 10 | Chrome DevTools manual fixture check | Pass | 사용자 확인: Phase 10 Manual Fixture Chrome DevTools 확인 완료 |
| 2026-06-26 | 11 | `node scripts/smoke-test.js` | Pass | public API, 필수 섹션, placeholder 제거, visible/hidden label, Raw Details group 확인 |
| 2026-06-26 | 11 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 11 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 12 | `node scripts/concat-dev.js` | Pass | `src/roles/infer-role.js` 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 12 | `node scripts/smoke-test.js` | Pass | role split 후 public API, 필수 섹션, placeholder 제거, visible/hidden label, Raw Details group 유지 |
| 2026-06-26 | 12 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 12 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 12 | Chrome DevTools role split check | Pass | 사용자 확인: Phase 12 Role Split Chrome DevTools 확인 완료 |
| 2026-06-26 | 13 | `node scripts/concat-dev.js` | Pass | text helper / concise selector 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 13 | `node scripts/smoke-test.js` | Pass | readable text, concise Typography selector, hidden label 제외 확인 |
| 2026-06-26 | 13 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 13 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 13 | Chrome DevTools quality check | Pending | 사용자가 regenerated dist로 Chrome에서 확인 필요 |
| 2026-06-26 | 14 | `node scripts/concat-dev.js` | Pass | v0.2.0 renderer formatting 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 14 | `node scripts/smoke-test.js` | Pass | table / fenced tree / Typography Summary+Text Details / Raw Details table 형식 확인 |
| 2026-06-26 | 14 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 14 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 14 | Chrome DevTools formatting check | Pending | 사용자가 regenerated dist로 Chrome에서 확인 필요 |
| 2026-06-26 | 15 | `node scripts/concat-dev.js` | Pass | child tree readability 개선 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 15 | `node scripts/smoke-test.js` | Pass | required sections, hidden filtering, fenced child tree, 의미 노드 포함 확인 |
| 2026-06-26 | 15 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 15 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 15 | Chrome DevTools child tree readability check | Pending | 사용자가 regenerated dist로 Chrome에서 확인 필요 |
| 2026-06-26 | 15 | v0.2.1 polish `node scripts/concat-dev.js` | Pass | layout-only spacer skip과 role label 보강 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 15 | v0.2.1 polish `node scripts/smoke-test.js` | Pass | 기존 fixture 계약과 child tree readability 유지 |
| 2026-06-26 | 15 | v0.2.1 polish static check | Pass | context mutation 없음, DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |
| 2026-06-26 | 15 | v0.2.1 polish regression fix | Pass | broad `Action Group` 판정을 줄여 Button / Link leaf traversal 복구, spacer skip 유지 |
| 2026-06-26 | 16 | `node scripts/concat-dev.js` | Pass | v0.2.2 Tree Label Polish 포함해 `dist/analyzer.dev.js` 재생성 |
| 2026-06-26 | 16 | `node scripts/smoke-test.js` | Pass | `Action Group (span)` 제외, selector class dedupe, 기존 fixture 계약 유지 |
| 2026-06-26 | 16 | Context static check 3종 `rg` | Pass | direct context mutation 의심 패턴 없음 |
| 2026-06-26 | 16 | DOM read static check `rg` | Pass | DOM 직접 호출은 validation / `src/dom/helpers.js`에 한정 |

## Fixture Log

| 날짜 | 사이트 | 대상 | 결과 | 메모 |
|---|---|---|---|---|
| 2026-06-25 | Local | `fixtures/manual/header-basic.html` Header | Pass | 사용자 확인: Chrome DevTools manual fixture 확인 완료 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | `node scripts/smoke-test.js` 통과 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | 사용자 확인: Phase 12 Role Split Chrome DevTools 확인 완료 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | Phase 13 smoke test 통과, Chrome DevTools 확인 대기 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | v0.2.0 formatting smoke test 통과, Chrome DevTools 확인 대기 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | v0.2.1 child tree readability smoke test 통과, Chrome DevTools 확인 대기 |
| 2026-06-26 | Local | `fixtures/manual/header-basic.html` Header | Pass | v0.2.2 tree label polish smoke test 통과, Chrome DevTools 확인 대기 |
| - | Stripe | Header | Pending | - |
| - | Vercel | Header | Pending | - |
| - | Linear | Header | Pending | - |

## Deferred

초기 v2에서 하지 않는다.

- Chrome Extension UI
- screenshot 자동화
- hover/focus 분석
- Figma 비교 기능
- Web App 연동
- 결제/계정 기능
- 1000개 사이트 선테스트
- output format 전면 변경

## Update Rule

이 문서는 다음 경우 업데이트한다.

- Phase가 변경될 때
- runtime check를 수행했을 때
- fixture 비교를 했을 때
- 실패 유형이 발견됐을 때
- 중요한 아키텍처 결정을 바꿨을 때
- 보류 사항을 해제했을 때
