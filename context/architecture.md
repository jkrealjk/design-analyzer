# Architecture

## 목적

이 문서는 DevTools Design Analyzer v2의 전체 구조를 정의한다.

v2는 기존 3000줄 단일 파일을 그대로 쪼개는 작업이 아니다.

기존 안정 버전은 legacy oracle로 보존하고, v2는 새 아키텍처 기준으로 clean rewrite한다.

## 핵심 방향

- public API는 유지한다.
- 출력 계약은 유지한다.
- legacy 파일은 수정하지 않는다.
- v2 코드는 명확한 모듈 경계를 가진다.
- 모듈 간 의존성은 context로 전달한다.
- `index.js`는 public API 연결만 담당한다.
- `analyzer.js`는 전체 분석 흐름만 담당한다.
- DOM read는 가능한 한 context helper를 통해 수행한다.
- role 판별은 안정화 후 단계적으로 분리한다.

## 폴더 구조

권장 구조는 다음과 같다.

```txt
/
├─ AGENTS.md
├─ context/
│  ├─ project-overview.md
│  ├─ output-contract.md
│  ├─ public-api.md
│  ├─ fixture-plan.md
│  ├─ architecture.md
│  ├─ module-map.md
│  ├─ code-standards.md
│  ├─ refactor-plan.md
│  ├─ runtime-checklist.md
│  └─ progress-tracker.md
├─ legacy/
│  └─ analyzeSelectedElementReadable.stable.js
├─ fixtures/
│  ├─ manual/
│  │  ├─ stripe-header.md
│  │  ├─ vercel-header.md
│  │  └─ linear-header.md
│  ├─ smoke/
│  │  └─ sites.json
│  └─ results/
└─ src/
   ├─ index.js
   ├─ analyzer.js
   ├─ core/
   ├─ dom/
   ├─ collect/
   ├─ roles/
   ├─ formatters/
   └─ markdown/
```

## Runtime Namespace

브라우저 런타임에서는 내부 공개 함수를 `window.DA` 아래에 둔다.

기본 namespace는 다음과 같다.

- `DA.core`
- `DA.dom`
- `DA.collect`
- `DA.roles`
- `DA.formatters`
- `DA.markdown`
- `DA.analyzeSelectedElementReadable`

내부 helper를 `window`에 직접 노출하지 않는다.

## Public Entry

사용자가 직접 호출하는 함수는 하나다.

`window.analyzeSelectedElementReadable`

이 함수는 내부적으로 다음 함수에 연결된다.

`window.DA.analyzeSelectedElementReadable`

`index.js`는 이 연결만 담당한다.

## index.js 책임

`src/index.js`의 책임은 public API 연결이다.

허용되는 일:

- `window.DA` 존재 확인
- `DA.analyzeSelectedElementReadable` 존재 확인
- `window.analyzeSelectedElementReadable` 연결
- 연결 실패 시 명확한 에러 메시지 제공

금지되는 일:

- 분석 로직 작성
- DOM 측정 작성
- role 판별 작성
- Markdown 생성
- legacy helper alias 복구
- 임시 fallback helper 생성

## analyzer.js 책임

`src/analyzer.js`는 전체 분석 흐름만 조율한다.

허용되는 일:

- root 검증 요청
- analyzer context 생성
- selected element 수집 호출
- child tree 수집 호출
- typography 수집 호출
- raw details 수집 호출
- Markdown renderer 호출
- output validation 호출
- 최종 Markdown string 반환

금지되는 일:

- DOM rect 계산 상세
- computed style parsing 상세
- role heuristic 작성
- logo/nav/action 판별 상세
- Markdown line 직접 조립
- color formatting 상세
- selector 생성 상세

## 모듈 책임

각 모듈의 큰 책임은 다음과 같다.

### core

런타임 안정성, context 생성, validation, smoke test를 담당한다.

예상 역할:

- namespace 초기화
- runtime check
- root validation
- output validation
- analyzer context 생성
- role context 생성
- 실행 단위 cache 생성

### dom

DOM과 computed style 접근을 담당한다.

예상 역할:

- rect 측정
- computed style 읽기
- visibility 판별
- selector 생성
- source path 생성
- child traversal helper
- context cache를 사용하는 DOM read helper 제공

### collect

분석 데이터를 수집한다.

예상 역할:

- selected element data 수집
- child tree data 수집
- typography data 수집
- raw details data 수집
- skipped wrapper data 수집

### roles

요소의 의미적 역할을 판별한다.

예상 역할:

- `inferRole`
- logo 후보 판별
- navigation 후보 판별
- action/button/link 후보 판별
- decorative SVG 판별

초기에는 `inferRole`을 너무 빨리 쪼개지 않는다.

### formatters

값을 출력용 문자열로 변환한다.

예상 역할:

- color formatting
- width behavior formatting
- spacing formatting
- typography formatting
- visual summary formatting
- size summary formatting

### markdown

수집된 데이터를 Markdown 리포트로 렌더링한다.

예상 역할:

- Selected Element 섹션 렌더링
- Annotated Structure 섹션 렌더링
- Typography 섹션 렌더링
- Raw Details 섹션 렌더링
- 최종 Markdown 조립

markdown 모듈은 DOM을 직접 읽지 않는다.

## 데이터 흐름

기본 데이터 흐름은 다음과 같다.

```txt
public API
↓
root resolution
↓
root validation
↓
analyzer context 생성
↓
selected element 수집
↓
child tree 수집
↓
typography 수집
↓
raw details 수집
↓
Markdown render
↓
output validation
↓
Markdown string 반환
```

## Context 구조

모듈 간 의존성은 context로 전달한다.

주요 context는 두 가지다.

- `analyzerContext`
- `roleContext`

`analyzerContext`는 전체 분석 흐름에서 사용한다.

`roleContext`는 role 판별 함수에 전달한다.

role 관련 함수는 다음 형태를 따른다.

- `inferRole(el, roleContext)`
- `isLogoCandidate(el, roleContext)`
- `isNavCandidate(el, roleContext)`
- `isActionCandidate(el, roleContext)`

함수 인자에서 context를 깊게 destructuring하지 않는다.

## Context Cache

`analyzerContext`는 한 번의 분석 실행 동안 공유되는 cache를 가질 수 있다.

목적은 여러 모듈에서 같은 요소의 DOM 정보를 반복해서 읽는 것을 줄이는 것이다.

캐싱할 수 있는 값:

- computed style
- bounding rect
- visibility result
- selector
- source path
- role inference result

권장 cache 이름:

- `styleCache`
- `rectCache`
- `visibilityCache`
- `selectorCache`
- `sourcePathCache`
- `roleCache`

가능하면 Element를 key로 쓰는 `WeakMap`을 사용한다.

`getComputedStyle`이나 `getBoundingClientRect`를 각 모듈이 직접 반복 호출하지 않는다.

대신 `context.dom` helper를 통해 읽는다.

이렇게 하면 중복 DOM read를 줄이고, 분석 성능과 결과 일관성을 높일 수 있다.

cache는 전역으로 두지 않는다.

cache는 한 번의 분석 실행 안에서만 유효하다.

분석 실행이 끝난 뒤 cache를 재사용하지 않는다.

## Wrapper 처리 위치

wrapper 생략 여부는 collect 단계에서 판단한다.

Annotated Structure에서는 불필요한 wrapper를 생략할 수 있다.

하지만 Source Path와 Skipped Wrappers는 Raw Details에서 추적 가능해야 한다.

layout, spacing, visual, position, accessibility에 영향을 주는 wrapper는 생략하지 않는다.

## Hidden Element 처리 위치

hidden element 판별은 dom 또는 core 쪽에서 공통 helper로 제공한다.

collect와 typography 수집은 이 helper를 사용한다.

Annotated Structure와 Typography는 hidden layer를 기본적으로 제외한다.

Raw Details는 검증 목적상 일부 생략 요소를 보존할 수 있다.

## SVG 처리 위치

SVG 판별은 roles 또는 dom helper를 통해 처리한다.

의미 있는 SVG는 Annotated Structure에 표시할 수 있다.

장식용 SVG는 메인 구조에서 제외하고 Raw Details에만 남길 수 있다.

## Legacy와 v2 관계

legacy 파일은 기준 파일이다.

`legacy/analyzeSelectedElementReadable.stable.js`

이 파일은 수정하지 않는다.

v2는 legacy 코드를 그대로 분리하지 않는다.

v2는 새 구조로 작성하되, legacy의 좋은 heuristic은 문서화한 뒤 다시 구현한다.

fixture 비교를 통해 legacy와 v2의 주요 분석 의미가 유지되는지 확인한다.

## 테스트 연결

architecture는 fixture-plan과 연결된다.

수동 fixture는 핵심 분석 품질을 검증한다.

smoke test는 여러 사이트에서 런타임 안정성을 검증한다.

regression test는 변경 후 품질 하락을 검증한다.

자동 테스트에서는 `$0`에 의존하지 않고 root element를 명시적으로 전달한다.

## 하지 않을 것

초기 architecture 단계에서는 다음을 하지 않는다.

- build system 도입
- Chrome Extension UI 설계
- 모든 role 모듈 세부 계약 작성
- inferRole 선분리
- legacy 파일 직접 분해
- public API 변경
- output format 변경
- 전역 cache 생성

## 성공 기준

architecture가 지켜졌다고 판단하는 기준은 다음과 같다.

- public API가 하나로 유지된다.
- `index.js`는 연결만 담당한다.
- `analyzer.js`는 orchestration만 담당한다.
- DOM, role, formatter, markdown 책임이 섞이지 않는다.
- 모듈 간 의존성은 context로 전달된다.
- DOM read는 context helper와 cache를 통해 관리된다.
- cache는 한 번의 분석 실행 안에서만 사용된다.
- legacy 파일은 수정되지 않는다.
- output contract와 public API contract가 깨지지 않는다.
- fixture와 runtime check로 v2 결과를 검증할 수 있다.