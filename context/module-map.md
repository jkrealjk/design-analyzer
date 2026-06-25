# Module Map

## 목적

이 문서는 DevTools Design Analyzer v2의 모듈 구조와 파일별 책임을 정의한다.

`architecture.md`가 전체 설계도라면, `module-map.md`는 실제 코드 파일의 역할표다.

v2는 기존 단일 파일을 그대로 쪼개는 방식이 아니라, 책임 단위로 clean rewrite한다.

## 핵심 원칙

- 한 파일은 하나의 책임만 가진다.
- public API 연결은 `index.js`가 담당한다.
- 전체 분석 흐름은 `analyzer.js`가 담당한다.
- DOM read는 `dom` 모듈과 context helper를 통해 수행한다.
- role 판별은 `roles` 모듈에 둔다.
- 데이터 수집은 `collect` 모듈에 둔다.
- 값 변환은 `formatters` 모듈에 둔다.
- Markdown 생성은 `markdown` 모듈에 둔다.
- 같은 폴더의 형제 모듈끼리 직접 얽히지 않는다.
- 순환 참조를 만들지 않는다.
- legacy helper alias로 오류를 숨기지 않는다.

## 전체 구조

아래 구조는 최종 목표 구조다.

초기 구현에서는 파일 수를 줄여도 된다.

하지만 책임 경계와 호출 방향은 처음부터 이 문서를 따른다.

```txt
src/
├─ index.js
├─ analyzer.js
├─ core/
│  ├─ namespace.js
│  ├─ context.js
│  ├─ validation.js
│  ├─ output-validation.js
│  └─ runtime-checks.js
├─ dom/
│  ├─ style.js
│  ├─ rect.js
│  ├─ visibility.js
│  ├─ traversal.js
│  ├─ selector.js
│  └─ source-path.js
├─ collect/
│  ├─ selected.js
│  ├─ tree.js
│  ├─ typography.js
│  ├─ raw-details.js
│  └─ wrappers.js
├─ roles/
│  ├─ infer-role.js
│  ├─ logo.js
│  ├─ navigation.js
│  ├─ actions.js
│  └─ svg.js
├─ formatters/
│  ├─ color.js
│  ├─ size.js
│  ├─ spacing.js
│  ├─ typography.js
│  ├─ visual.js
│  └─ width-behavior.js
└─ markdown/
   ├─ render-report.js
   ├─ selected-section.js
   ├─ annotated-structure.js
   ├─ typography-section.js
   └─ raw-details-section.js
```

## Final Structure vs Initial Implementation

이 문서의 파일 구조는 최종 목표 구조다.

초기 vertical slice에서는 모든 파일을 처음부터 만들 필요는 없다.

처음에는 폴더 단위 통합 파일로 시작할 수 있다.

예시 초기 구조:

```txt
src/
├─ index.js
├─ analyzer.js
├─ core.js
├─ dom.js
├─ collect.js
├─ roles.js
├─ formatters.js
└─ markdown.js
```

단, 파일을 합쳐서 시작하더라도 책임 경계는 처음부터 지킨다.

예를 들어 `dom.js` 안에는 DOM read helper만 둔다.

`roles.js` 안에는 role 판별만 둔다.

`collect.js` 안에는 데이터 수집만 둔다.

`formatters.js` 안에는 값 변환만 둔다.

`markdown.js` 안에서는 DOM을 직접 읽지 않는다.

코드가 커지면 이 문서의 최종 구조에 맞춰 세부 파일로 분리한다.

초기 구현 목표는 파일 개수를 많이 만드는 것이 아니라, 작은 vertical slice를 안정적으로 완성하는 것이다.

## Folder Coordinator Pattern

같은 폴더 안에 여러 helper 파일이 있을 경우, 직접 서로를 호출하기보다 조율자 파일을 둔다.

조율자 파일은 같은 폴더 안의 helper를 호출해 결과를 합친다.

helper 파일은 가능한 한 순수 판별 또는 변환만 담당한다.

예시:

```txt
roles/infer-role.js
├─ logo.js
├─ navigation.js
├─ actions.js
└─ svg.js
```

좋은 흐름:

```txt
infer-role.js → logo.js
infer-role.js → navigation.js
infer-role.js → actions.js
infer-role.js → svg.js
```

나쁜 흐름:

```txt
logo.js → navigation.js
navigation.js → actions.js
actions.js → logo.js
```

## Sibling Module Rules

같은 폴더 안의 형제 모듈은 서로 직접 호출하지 않는 것을 기본 원칙으로 한다.

공통 로직이 필요하면 책임에 맞는 위치로 이동한다.

- DOM 관련 공통 로직 → `dom/`
- 출력값 변환 공통 로직 → `formatters/`
- root/context/validation 관련 공통 로직 → `core/`
- role 조합 로직 → `roles/infer-role.js`
- wrapper 판단 공통 로직 → `collect/wrappers.js`
- markdown 섹션 조합 → `markdown/render-report.js`

형제 모듈 간 직접 호출은 꼭 필요한 경우에만 허용한다.

그 경우에도 순환 참조가 생기면 안 된다.

## Circular Dependency Rules

순환 참조는 금지한다.

금지 예시:

```txt
roles/logo.js → roles/navigation.js → roles/actions.js → roles/logo.js
collect/tree.js → collect/wrappers.js → collect/tree.js
markdown/annotated-structure.js → collect/tree.js → markdown/annotated-structure.js
```

순환 참조가 필요해 보이면 구조가 잘못된 것이다.

공통 로직을 더 낮은 helper로 분리하거나, 상위 조율자 파일에서 흐름을 관리한다.

## index.js

책임:

- `window.DA` 존재 확인
- `DA.analyzeSelectedElementReadable` 존재 확인
- `window.analyzeSelectedElementReadable` 연결
- 연결 실패 시 명확한 에러 제공

하지 않는 일:

- 분석 실행
- DOM 측정
- role 판별
- Markdown 생성
- legacy helper alias 복구
- 파일 로딩 순서 문제 우회

`index.js`는 최대한 얇게 유지한다.

## analyzer.js

책임:

- root resolution
- root validation 호출
- analyzer context 생성
- selected element 수집 호출
- child tree 수집 호출
- typography 수집 호출
- raw details 수집 호출
- Markdown renderer 호출
- output validation 호출
- partial failure 처리
- 최종 Markdown string 반환

하지 않는 일:

- `getComputedStyle` 직접 호출
- `getBoundingClientRect` 직접 호출
- role heuristic 작성
- Markdown line 직접 조립
- color formatting 상세 처리
- selector 생성 상세 처리

## core/

책임:

- `window.DA` namespace 초기화
- root validation
- output validation
- analyzer context 생성
- role context 생성
- 실행 단위 cache 생성
- runtime check 제공

주요 파일:

- `namespace.js`: `window.DA` 초기화
- `context.js`: `analyzerContext`, `roleContext`, cache 생성
- `validation.js`: root 검증
- `output-validation.js`: 필수 Markdown 섹션 검증
- `runtime-checks.js`: 개발용 runtime/smoke check

## dom/

책임:

- DOM read helper 제공
- computed style 읽기
- rect 측정
- visibility 판별
- traversal helper
- selector 생성
- source path 생성

주요 파일:

- `style.js`: `getComputedStyle` wrapper와 style cache
- `rect.js`: `getBoundingClientRect` wrapper와 rect cache
- `visibility.js`: hidden 여부 판별
- `traversal.js`: child traversal과 depth/node limit
- `selector.js`: Raw Details용 selector 생성
- `source-path.js`: 원본 DOM 경로 생성

다른 모듈은 가능하면 DOM API를 직접 호출하지 않고 `context.dom` helper를 사용한다.

## collect/

책임:

- 분석에 필요한 intermediate data 수집
- Selected Element data 수집
- Annotated Structure data 수집
- Typography data 수집
- Raw Details data 수집
- Skipped Wrappers data 수집

주요 파일:

- `selected.js`: root element 요약 데이터 수집
- `tree.js`: child tree 수집 조율
- `typography.js`: visible text typography 수집
- `raw-details.js`: 검증용 원본 세부 정보 수집
- `wrappers.js`: wrapper 생략 여부 판단

`tree.js`는 `wrappers.js`를 helper로 사용할 수 있다.

`wrappers.js`는 `tree.js`를 다시 호출하지 않는다.

## roles/

책임:

- 요소의 의미적 role 판별
- logo/nav/action/svg 후보 판별
- decorative SVG 판별

주요 파일:

- `infer-role.js`: role 판별 조율자
- `logo.js`: logo 후보 판별
- `navigation.js`: nav/list/menu 후보 판별
- `actions.js`: button/link/CTA 후보 판별
- `svg.js`: 의미 있는 SVG와 장식용 SVG 판별

초기에는 `inferRole`을 너무 빨리 쪼개지 않는다.

`logo.js`, `navigation.js`, `actions.js`, `svg.js`는 서로 직접 호출하지 않는다.

조합 판단은 `infer-role.js`에서 수행한다.

## formatters/

책임:

- 수집된 값을 출력용 문자열로 변환한다.
- DOM을 직접 읽지 않는다.
- 데이터 수집을 하지 않는다.

주요 파일:

- `color.js`: rgb/rgba/gradient/shadow formatting
- `size.js`: size summary formatting
- `spacing.js`: padding/margin/border/gap formatting
- `typography.js`: typography value formatting
- `visual.js`: background/border/radius/shadow summary formatting
- `width-behavior.js`: width behavior label formatting

## markdown/

책임:

- 수집된 데이터를 Markdown string으로 렌더링한다.
- output contract의 섹션 순서를 유지한다.
- DOM을 직접 읽지 않는다.

주요 파일:

- `render-report.js`: 전체 Markdown 조립자
- `selected-section.js`: `## Selected Element`
- `annotated-structure.js`: `## Child Elements — Annotated Structure`
- `typography-section.js`: `## Typography`
- `raw-details-section.js`: `<details><summary>Raw Details</summary>`

섹션 파일끼리는 서로 직접 호출하지 않는다.

조합은 `render-report.js`에서 수행한다.

## 호출 방향

권장 호출 방향:

```txt
index
↓
analyzer
↓
core / collect
↓
dom / roles / formatters
↓
markdown
```

실제 흐름:

```txt
analyzer
├─ core
├─ collect
│  ├─ dom
│  ├─ roles
│  └─ formatters
└─ markdown
   └─ formatters
```

## 금지되는 호출 방향

다음 흐름은 금지한다.

- `index.js` → `dom`
- `index.js` → `roles`
- `index.js` → `markdown`
- `markdown` → `dom`
- `markdown` → `roles`
- `markdown` → `collect`
- `roles` → `markdown`
- `roles` → `collect`
- `formatters` → `dom`
- `formatters` → `collect`
- `dom` → `markdown`
- `dom` → `roles`
- `dom` → `collect`

## Context 전달 규칙

주요 함수는 필요한 context를 명시적으로 받는다.

예시:

- `collectSelected(el, analyzerContext)`
- `collectTree(el, analyzerContext)`
- `collectTypography(el, analyzerContext)`
- `inferRole(el, roleContext)`
- `renderReport(reportData, analyzerContext)`

깊은 destructuring으로 context 구조를 숨기지 않는다.

전역 helper에 의존하지 않는다.

## Legacy 관련 규칙

legacy 파일은 기준으로만 사용한다.

허용:

- legacy output 확인
- legacy heuristic 참고
- fixture 생성에 사용
- 실패 케이스 비교

금지:

- legacy 파일 직접 수정
- legacy 파일을 그대로 잘라서 붙이기
- legacy helper를 window에 다시 노출
- missing helper를 legacy alias로 복구

## 초기 구현 순서

권장 구현 순서:

1. `core/namespace.js`
2. `core/validation.js`
3. `core/output-validation.js`
4. `core/context.js`
5. `analyzer.js`
6. `index.js`
7. `dom/style.js`, `dom/rect.js`, `dom/visibility.js`
8. `roles/infer-role.js`
9. `collect/selected.js`
10. `collect/wrappers.js`, `collect/tree.js`
11. `collect/typography.js`, `collect/raw-details.js`
12. `formatters/*`
13. `markdown/*`
14. `core/runtime-checks.js`

초기 통합 파일로 시작하는 경우도 같은 순서를 따른다.

초기에는 작은 vertical slice를 먼저 만든다.

최소 목표는 `analyzeSelectedElementReadable($0)`가 필수 섹션을 가진 Markdown string을 반환하는 것이다.

## 하지 않을 것

초기 module-map 단계에서는 다음을 하지 않는다.

- 모든 helper를 한 번에 세분화하기
- inferRole을 처음부터 과하게 분리하기
- build system 전제하기
- TypeScript 전환 전제하기
- Chrome Extension UI 전제하기
- Markdown 모듈에서 DOM을 직접 읽기
- index.js에 임시 복구 코드 넣기
- 형제 모듈끼리 순환 호출 만들기
- fixture 없이 대규모 리팩터링하기

## 성공 기준

module-map이 지켜졌다고 판단하는 기준은 다음과 같다.

- 각 파일의 책임이 명확하다.
- `index.js`는 public API 연결만 담당한다.
- `analyzer.js`는 orchestration만 담당한다.
- DOM read는 dom/context helper를 통해 수행된다.
- role 판별은 roles 모듈에 있다.
- `roles/infer-role.js`가 role 조율자 역할을 한다.
- Markdown 생성은 markdown 모듈에 있다.
- `markdown/render-report.js`가 markdown 조율자 역할을 한다.
- formatter는 값 변환만 담당한다.
- 같은 폴더의 형제 모듈 간 순환 참조가 없다.
- legacy helper alias가 없다.
- output contract와 public API contract가 유지된다.
- fixture와 smoke test로 결과를 검증할 수 있다.