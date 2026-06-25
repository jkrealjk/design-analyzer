# AGENTS.md

# DevTools Design Analyzer v2 — 에이전트 지침

## 핵심 원칙

이 프로젝트는 DevTools에서 선택한 웹 요소를 분석해 Markdown 리포트로 출력하는 도구다.

빠르게 많이 만들기보다, 작게 나누고 깨지지 않게 작업한다.

기존에 잘 동작하던 분석 결과와 출력 포맷을 먼저 보존한다.

## 작업 전 확인

작업을 시작하기 전에 관련 context 문서를 먼저 읽는다.

- context/project-overview.md
- context/architecture.md
- context/output-contract.md
- context/module-map.md
- context/code-standards.md
- context/runtime-checklist.md
- context/progress-tracker.md

필요한 context 파일이 없으면, 새로 만들기 전에 사용자에게 확인한다.

## 작업 방식

- 한 번에 하나만 바꾼다.
- 변경 범위를 넓히지 않는다.
- 추측하지 말고 현재 파일을 먼저 확인한다.
- 구현보다 계약을 먼저 정한다.
- 작동하던 동작을 보존한다.
- 임시 패치보다 원인 해결을 우선한다.
- 복잡한 추상화보다 단순한 구조를 선택한다.

## 문서 규칙

문서는 한국어로 작성한다.

파일명, 함수명, 변수명, API 이름은 영어를 유지한다.

문서는 짧게 쓴다.

- 한 문서 = 한 책임
- 가능하면 200줄 이하
- 구현 설명보다 결정 사항 중심
- 긴 문서는 역할별로 분리
- 같은 내용을 여러 파일에 반복하지 않기

프로젝트 문서는 context/ 폴더에 둔다.

## Public API

사용자-facing API는 유지한다.

`analyzeSelectedElementReadable(root = $0)`

다음 호출은 항상 동작해야 한다.

`analyzeSelectedElementReadable($0)`

`analyzeSelectedElementReadable()`

사용자가 요청하지 않는 한 public API 이름을 바꾸지 않는다.

## Output Contract

v2 리팩터링 중 Markdown 출력 포맷을 바꾸지 않는다.

리포트는 반드시 다음 섹션을 유지한다.

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details><summary>Raw Details</summary>`

출력 개선은 v2 안정화 이후 별도 버전에서 진행한다.

## Architecture

내부 공개 함수는 모두 `window.DA` 아래에 둔다.

기본 namespace는 다음 구조를 따른다.

- `DA.core`
- `DA.dom`
- `DA.collect`
- `DA.roles`
- `DA.formatters`
- `DA.markdown`

내부 helper를 `window`에 직접 노출하지 않는다.

## 의존성 규칙

단일 파일 시절 helper 이름을 직접 호출하지 않는다.

나쁜 예:

- `getRect(el)`
- `inferRole(el)`
- `formatColor(value)`

좋은 예:

- `context.dom.getRect(el, context)`
- `context.roles.inferRole(el, context.roleContext)`
- `context.formatters.formatColor(value)`

모듈 간 의존성은 명시적인 context로 전달한다.

## Context

주요 context는 두 개다.

- `analyzerContext`: 전체 분석 흐름용
- `roleContext`: role 판별용

role 관련 함수는 항상 `roleContext`를 받는다.

예시:

- `inferRole(el, roleContext)`
- `isLogoCandidate(el, roleContext)`
- `isNavCandidate(el, roleContext)`
- `isActionCandidate(el, roleContext)`

함수 인자에서 context를 깊게 destructuring하지 않는다.

## analyzer.js

`analyzer.js`는 orchestration만 담당한다.

허용되는 역할:

- root 검증
- context 생성
- 데이터 수집 함수 호출
- Markdown 렌더 함수 호출
- 최종 string 반환

금지되는 역할:

- DOM 측정 상세
- role 판별 상세
- logo/nav/action heuristic
- Markdown line 직접 조립
- color formatting
- selector 생성

## index.js

`index.js`는 public API 연결만 담당한다.

역할은 하나다.

`window.analyzeSelectedElementReadable` → `window.DA.analyzeSelectedElementReadable`

`index.js`를 legacy alias 복구 파일로 사용하지 않는다.

금지 예시:

- `const getRect = DA.dom.getRect`
- `const inferRole = DA.roles.inferRole`
- `const isLogoWrapperCandidate = DA.roles.logo.isLogoWrapperCandidate`

## inferRole

`inferRole`은 초기에 쪼개지 않는다.

먼저 기존 안정 버전의 `inferRole` 로직을 하나의 덩어리로 옮긴다.

runtime check와 fixture 비교가 통과한 뒤에만 세부 role 모듈로 분리한다.

분리 순서:

1. `roles/actions.js`
2. `roles/nav.js`
3. `roles/logo.js`

logo는 사이트별 예외가 많으므로 마지막에 분리한다.

## Runtime Checks

중요한 변경 후에는 반드시 확인한다.

- `DA.core.checkRuntime()`
- `DA.core.smokeTest($0)`
- `analyzeSelectedElementReadable($0)`
- `analyzeSelectedElementReadable(document.body)`

콘솔 런타임 에러가 있으면 작업 완료로 보지 않는다.

## Fixtures

큰 리팩터링 전에는 안정 파일과 기준 출력을 보존한다.

- `legacy/analyzeSelectedElementReadable.stable.js`
- `fixtures/stripe-header.md`
- `fixtures/vercel-header.md`
- `fixtures/linear-header.md`

v2 출력이 fixture와 완전히 같을 필요는 없다.

하지만 구조, role 판별, typography, hidden element 처리, Raw Details 동작은 유지해야 한다.

## 유지해야 할 동작

기존 동작을 보존한다.

- hidden layer는 Annotated Structure와 Typography에서 제외한다.
- `display: contents` wrapper는 생략할 수 있지만 children은 계속 분석한다.
- 장식용 SVG는 Annotated Structure에서 숨기고 Raw Details에만 남길 수 있다.
- solid `rgb(...)`는 HEX로 변환한다.
- `rgba(...)`는 원문 유지한다.
- width는 viewport-dependent 숫자보다 behavior label을 우선한다.

## 금지

절대 하지 않는다.

- 한 번에 전체 리팩터링
- 관련 없는 파일 수정
- `index.js`에 임시 alias 추가
- old global helper 직접 호출
- markdown 모듈에서 DOM 직접 읽기
- role 모듈에서 Markdown 생성
- `analyzer.js`에 role heuristic 작성
- smoke test 전 `inferRole` 세부 분리
- v2 중 출력 포맷 변경
- stable legacy 파일 삭제
- 200줄 넘는 대형 문서 작성

## 완료 기준

작업은 다음 조건을 만족해야 완료다.

- 변경 범위가 작다.
- 관련 context 문서가 업데이트됐다.
- output contract가 유지됐다.
- runtime check가 통과한다.
- 필수 Markdown 섹션이 존재한다.
- 콘솔 런타임 에러가 없다.
- progress-tracker.md가 업데이트됐다.