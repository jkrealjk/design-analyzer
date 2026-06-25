# Public API

## 목적

이 문서는 DevTools Design Analyzer v2의 public API 계약을 정의한다.

public API는 사용자가 Chrome DevTools 콘솔에서 직접 호출하는 진입점이다.

v2는 clean rewrite로 작성되지만, 사용자가 호출하는 방식은 기존 흐름과 호환되어야 한다.

## 기본 API

사용자-facing public API 개념은 다음과 같다.

`analyzeSelectedElementReadable(root = $0)`

이 함수는 선택한 DOM 요소를 분석하고 Markdown string을 반환한다.

단, 실제 구현에서는 함수 파라미터 기본값에 `$0`를 직접 사용하지 않는다.

`$0`는 DevTools 콘솔 환경에서는 존재하지만, 테스트 환경이나 일반 브라우저 실행 환경에서는 존재하지 않을 수 있다.

## 지원해야 하는 호출 방식

다음 호출 방식은 항상 동작해야 한다.

- `analyzeSelectedElementReadable($0)`
- `analyzeSelectedElementReadable()`
- `analyzeSelectedElementReadable(document.body)`
- `analyzeSelectedElementReadable(document.querySelector("header"))`

사용자가 `root`를 직접 전달하면 그 요소를 분석한다.

`root`가 전달되지 않으면 DevTools의 현재 선택 요소인 `$0`를 fallback으로 사용한다.

단, `$0`가 없는 환경에서도 ReferenceError가 발생하면 안 된다.

## $0 처리 규칙

문서와 사용자 설명에서는 `analyzeSelectedElementReadable(root = $0)` 개념을 유지한다.

하지만 실제 구현에서는 다음처럼 함수 시그니처에 `$0`를 직접 넣지 않는다.

나쁜 예:

`function analyzeSelectedElementReadable(root = $0)`

좋은 예:

`function analyzeSelectedElementReadable(root)`

내부에서 안전하게 target을 결정한다.

`const target = root || (typeof $0 !== "undefined" ? $0 : null)`

이 규칙은 자동 테스트 환경에서도 API가 안전하게 동작하기 위해 필요하다.

## root 인자

`root`는 DOM Element여야 한다.

허용되는 값:

- `Element`
- DevTools selected element `$0`
- `document.body`
- `document.querySelector(...)` 결과

허용하지 않는 값:

- `null`
- `undefined`
- string selector
- number
- plain object
- array
- text node
- comment node
- `document`

문자열 selector를 public API에서 직접 받는 것은 기본 계약에 포함하지 않는다.

selector 지원이 필요하면 나중에 별도 helper로 추가한다.

## root 검증 기준

최종 target은 DOM Element여야 한다.

검증 기준은 다음과 같다.

- 값이 존재해야 한다.
- `nodeType`이 `1`이어야 한다.
- Element API를 사용할 수 있어야 한다.
- `ownerDocument`가 존재해야 한다.

전체 문서를 분석해야 한다면 `document`가 아니라 `document.body`를 사용한다.

## 잘못된 root 처리

잘못된 root가 들어와도 원시 런타임 에러로 깨지면 안 된다.

나쁜 에러:

- `ReferenceError: $0 is not defined`
- `Cannot read properties of undefined`
- `root.querySelectorAll is not a function`

권장 메시지:

`DevTools Design Analyzer: valid root element is required. Select an element in DevTools or pass a DOM Element.`

에러를 반환하거나 console에 출력할 수 있지만, 실패 원인은 명확해야 한다.

## 반환값

public API는 최종 Markdown string을 반환한다.

반환값은 `context/output-contract.md`의 출력 계약을 따라야 한다.

필수 섹션은 다음과 같다.

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details><summary>Raw Details</summary>`

내부적으로 객체 형태의 intermediate data를 사용할 수는 있다.

하지만 public API 반환값은 Markdown string이어야 한다.

## Console 출력

console에 자동 출력할 수는 있지만, 반환값은 반드시 유지한다.

다음 방식이 가능해야 한다.

`const markdown = analyzeSelectedElementReadable($0)`

console 출력만 하고 반환값이 없는 방식은 허용하지 않는다.

## window 연결

브라우저 전역에는 다음 함수가 노출된다.

`window.analyzeSelectedElementReadable`

내부 구현은 `window.DA` 아래에 둔다.

권장 연결 방식:

`window.analyzeSelectedElementReadable = window.DA.analyzeSelectedElementReadable`

`index.js`는 이 연결만 담당한다.

## window.DA

내부 공개 함수는 `window.DA` namespace 아래에 둔다.

기본 구조는 다음을 따른다.

- `DA.core`
- `DA.dom`
- `DA.collect`
- `DA.roles`
- `DA.formatters`
- `DA.markdown`

public API 구현은 다음 위치에 둔다.

`DA.analyzeSelectedElementReadable`

최종 위치는 architecture 문서에서 확정한다.

## index.js 역할

`index.js`는 public API 연결만 담당한다.

허용되는 역할:

- `window.DA` 존재 확인
- `DA.analyzeSelectedElementReadable` 존재 확인
- `window.analyzeSelectedElementReadable` 연결
- 연결 실패 시 명확한 에러 메시지 제공

금지되는 역할:

- 분석 로직 작성
- role 판별 작성
- DOM 측정 작성
- Markdown 생성
- legacy helper alias 복구
- 임시 fallback helper 생성

## alias 복구 금지

`index.js`에서 기존 단일 파일 helper를 복구하기 위한 alias를 만들지 않는다.

금지 예시:

- `const getRect = DA.dom.getRect`
- `const inferRole = DA.roles.inferRole`
- `const formatColor = DA.formatters.formatColor`
- `const isLogoWrapperCandidate = DA.roles.logo.isLogoWrapperCandidate`

missing function 오류가 나면 alias를 추가하지 말고 module contract나 context 구조를 수정한다.

## Public API가 하지 않는 일

public API는 세부 분석을 직접 하지 않는다.

하지 않는 일:

- DOM rect 계산
- computed style parsing
- role detection
- logo/nav/action heuristic
- Markdown line 직접 조립
- color formatting
- selector generation
- hidden element filtering 상세 구현
- SVG 판별 상세 구현

public API는 analyzer를 호출하고 최종 Markdown string을 반환하는 입구다.

## 내부 흐름

public API의 내부 흐름은 다음과 같다.

1. 전달된 `root`를 확인한다.
2. `root`가 없으면 안전하게 `$0` fallback을 시도한다.
3. 최종 target이 유효한 DOM Element인지 검증한다.
4. analyzer context를 만든다.
5. analyzer를 실행한다.
6. Markdown string을 받는다.
7. 필수 출력 섹션을 검증한다.
8. Markdown string을 반환한다.

상세 구현은 architecture 문서와 module-map 문서에서 정의한다.

## Output Validation

public API는 최종 Markdown에 필수 섹션이 있는지 확인할 수 있다.

필수 확인 대상:

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details>`
- `<summary>Raw Details</summary>`

필수 섹션이 없으면 정상 완료로 보지 않는다.

## Breaking Change

다음 변경은 breaking change다.

- `analyzeSelectedElementReadable` 이름 변경
- DevTools selected element fallback 제거
- 반환값을 Markdown string이 아닌 객체로 변경
- 필수 출력 섹션 제거
- Raw Details 구조 제거
- DevTools 콘솔에서 직접 실행할 수 없게 변경
- `$0`가 없는 환경에서 ReferenceError 발생
- `index.js`가 public API 연결 외 역할을 하도록 변경

breaking change는 v2 리팩터링 범위에서 허용하지 않는다.

## 성공 기준

public API 계약이 지켜졌다고 판단하는 기준은 다음과 같다.

- `analyzeSelectedElementReadable($0)`가 동작한다.
- `analyzeSelectedElementReadable()`가 동작한다.
- `analyzeSelectedElementReadable(document.body)`가 동작한다.
- `$0`가 없는 테스트 환경에서도 ReferenceError가 발생하지 않는다.
- 반환값은 Markdown string이다.
- 필수 출력 섹션이 존재한다.
- invalid root에 대해 명확한 에러를 제공한다.
- `index.js`에 legacy alias가 없다.
- 세부 분석 로직이 public API에 섞이지 않는다.
- 기존 DevTools 사용 흐름과 호환된다.