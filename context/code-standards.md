# Code Standards

## 목적

이 문서는 DevTools Design Analyzer v2 구현 시 지켜야 할 코드 작성 규칙을 정의한다.

목표는 빠르게 많이 만드는 것이 아니라, 작게 만들고 안정적으로 검증하는 것이다.

## 핵심 원칙

- 한 번에 하나만 바꾼다.
- 변경 범위를 넓히지 않는다.
- 추측하지 말고 현재 파일과 context 문서를 먼저 확인한다.
- public API를 바꾸지 않는다.
- output contract를 바꾸지 않는다.
- legacy 파일을 수정하지 않는다.
- 임시 alias로 오류를 숨기지 않는다.
- 작은 vertical slice를 먼저 만든다.
- runtime check 전에는 완료로 보지 않는다.

## 작업 전 확인

작업 시작 전 관련 문서를 먼저 읽는다.

- `context/project-overview.md`
- `context/output-contract.md`
- `context/public-api.md`
- `context/fixture-plan.md`
- `context/architecture.md`
- `context/module-map.md`
- `context/code-standards.md`

문서끼리 충돌하면 코드를 작성하기 전에 멈춘다.

## Public API

사용자-facing API는 유지한다.

`analyzeSelectedElementReadable(root = $0)`

문서상 개념은 위와 같지만, 실제 구현에서는 함수 기본값에 `$0`를 직접 쓰지 않는다.

금지:

`function analyzeSelectedElementReadable(root = $0)`

권장:

`function analyzeSelectedElementReadable(root)`

내부에서 안전하게 target을 결정한다.

`const target = root || (typeof $0 !== "undefined" ? $0 : null)`

`$0`가 없는 환경에서도 ReferenceError가 발생하면 안 된다.

## Output

최종 반환값은 Markdown string이다.

필수 섹션은 유지한다.

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details><summary>Raw Details</summary>`

출력 포맷 변경은 v2 초기 리팩터링 범위에 포함하지 않는다.

## Source / Build

소스 코드는 가능하면 ES Modules 기반으로 작성한다.

권장:

- `import`
- `export`
- 명시적 의존성
- JSDoc 기반 타입 힌트
- editor Go to Definition 지원

DevTools에서 실행하는 파일은 단일 dist 파일이어야 한다.

```txt
src/ = 개발용 모듈 구조
dist/analyzer.dev.js = DevTools 실행용 단일 파일
```

초기 실험 단계에서는 `concat-dev.js`를 사용할 수 있다.

하지만 concat은 장기 전략이 아니라 임시 개발 전략이다.

파일 수가 늘거나 module boundary가 안정되면 ES Modules 기반 빌드 방식으로 전환한다.

## concat 규칙

concat을 사용할 경우 다음 규칙을 지킨다.

- 파일 순서는 명시적으로 관리한다.
- `namespace.js`는 가장 먼저 온다.
- `index.js`는 가장 마지막에 온다.
- concat 결과 전체는 하나의 IIFE로 감싼다.
- IIFE 밖으로 노출되는 값은 `window.DA`와 `window.analyzeSelectedElementReadable`만 허용한다.

개별 helper 함수나 내부 cache는 window에 직접 노출하지 않는다.

concat으로 인한 파일 순서 문제를 `index.js` alias로 우회하지 않는다.

## Debugging / JSDoc

concat된 파일에서만 에러가 보이면 원본 위치 추적이 어렵다.

가능하면 다음 중 하나를 준비한다.

- ES Modules 기반 개발
- source map 지원
- dist 파일 안에 file boundary comment 삽입

예시:

`// ---- src/dom/style.js ----`

주요 데이터 구조에는 JSDoc을 사용한다.

우선 대상:

- `analyzerContext`
- `roleContext`
- `reportData`
- `treeNodeData`
- `typographyData`
- `rawDetailsData`

작은 순수 함수까지 과하게 문서화하지 않는다.

## Module Boundary

모듈 책임을 섞지 않는다.

- `index.js`는 public API 연결만 담당한다.
- `analyzer.js`는 orchestration만 담당한다.
- `dom`은 DOM read만 담당한다.
- `roles`는 role 판별만 담당한다.
- `collect`는 intermediate data 수집만 담당한다.
- `formatters`는 값 변환만 담당한다.
- `markdown`은 Markdown string 렌더링만 담당한다.

금지:

- `markdown`에서 DOM 직접 읽기
- `roles`에서 Markdown 생성하기
- `formatters`에서 DOM 읽기
- `index.js`에서 분석 로직 작성하기
- `analyzer.js`에서 role heuristic 작성하기
- legacy helper alias 만들기

## Sibling Module

같은 폴더의 형제 모듈끼리 직접 얽히지 않는다.

공통 로직은 책임에 맞는 위치로 이동한다.

- role 조합 → `roles/infer-role.js`
- markdown 조합 → `markdown/render-report.js`
- wrapper 판단 → `collect/wrappers.js`
- DOM 공통 로직 → `dom/`
- formatter 공통 로직 → `formatters/`

순환 참조는 금지한다.

## Context

context는 필요한 경계 함수에만 전달한다.

권장:

- `collectTree(el, analyzerContext)`
- `collectTypography(el, analyzerContext)`
- `inferRole(el, roleContext)`
- `renderReport(reportData, analyzerContext)`

작은 순수 함수에는 context를 넘기지 않는다.

권장:

- `formatColor(value)`
- `normalizeText(text)`
- `formatSpacing(spacing)`

context는 읽기 전용으로 취급한다.

직접 변경 금지:

- `context.options`
- `context.limits`
- `context.dom`
- `context.roles`
- `context.formatters`
- `context.root`
- `context.cache`

필요한 변경은 return value로 전달한다.

## DOM Read / Cache

DOM read는 `context.dom` helper를 통해 수행한다.

가능하면 다음 API를 각 모듈에서 직접 반복 호출하지 않는다.

- `getComputedStyle`
- `getBoundingClientRect`
- `querySelectorAll`
- 복잡한 selector traversal

권장:

- `context.dom.getStyle(el)`
- `context.dom.getRect(el)`
- `context.dom.isVisible(el)`
- `context.dom.getSelector(el)`
- `context.dom.getSourcePath(el)`

cache는 한 번의 분석 실행 안에서만 사용한다.

전역 cache를 만들지 않는다.

가능하면 Element를 key로 쓰는 `WeakMap`을 사용한다.

cache 갱신은 helper 내부에서만 한다.

## Error Handling

예상 가능한 DOM 접근 실패는 안전하게 처리한다.

하나의 node 실패가 전체 분석 실패로 이어지면 안 된다.

가능한 경우 `unknown`, `error`, fallback note로 처리한다.

기본 기준:

- root validation 실패 → 전체 실패 가능
- selected element 수집 실패 → 명확한 analyzer error
- child tree 일부 실패 → 해당 node만 `unknown` 또는 `error`
- typography 실패 → Typography 섹션에 fallback note
- raw details 실패 → Raw Details에 error note
- markdown render 실패 → 명확한 analyzer error

실패를 완전히 숨기지 않는다.

Raw Details 또는 fallback note에 짧게 남긴다.

## Formatting

출력용 문자열 변환은 `formatters`에서 한다.

기본 규칙:

- solid `rgb(...)`는 HEX로 변환한다.
- `rgba(...)`는 원문 유지한다.
- shadow는 원문 또는 `present`로 표시한다.
- width는 raw pixel보다 behavior label을 우선한다.
- 의미 없는 0 값은 과도하게 반복하지 않는다.
- hidden text는 Typography에 포함하지 않는다.

## Legacy

legacy 파일은 기준으로만 사용한다.

허용:

- legacy output 확인
- heuristic 참고
- fixture 생성
- 실패 케이스 비교

금지:

- legacy 파일 수정
- legacy 파일을 그대로 잘라 붙이기
- legacy helper를 window에 다시 노출
- missing helper를 legacy alias로 복구

## Runtime Check

중요 변경 후에는 다음을 확인한다.

- `DA.core.checkRuntime()`
- `DA.core.smokeTest($0)`
- `analyzeSelectedElementReadable($0)`
- `analyzeSelectedElementReadable(document.body)`

자동 테스트 환경에서는 `$0`에 의존하지 않는다.

root element를 명시적으로 전달한다.

## 완료 기준

작업 완료 기준은 다음과 같다.

- public API가 동작한다.
- Markdown string을 반환한다.
- 필수 출력 섹션이 존재한다.
- 콘솔 런타임 에러가 없다.
- invalid root에 명확한 에러를 제공한다.
- `index.js`에 legacy alias가 없다.
- module boundary가 지켜졌다.
- context를 직접 mutate하지 않았다.
- DOM read는 context helper를 통해 수행된다.
- legacy 파일을 수정하지 않았다.
- 관련 문서 또는 progress tracker를 업데이트했다.