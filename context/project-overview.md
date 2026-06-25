# Project Overview

## 목적

DevTools Design Analyzer는 Chrome DevTools에서 선택한 웹 요소를 분석해 Markdown 리포트로 출력하는 도구다.

사용자는 DevTools에서 요소를 선택한 뒤 `analyzeSelectedElementReadable(root = $0)`를 실행하고, 결과를 Obsidian 같은 Markdown 노트에 저장해 웹사이트 디자인 레퍼런스를 분석한다.

이 도구의 목적은 웹사이트의 구조, 레이아웃, 크기, 타이포그래피, 시각적 스타일을 빠르게 읽을 수 있는 분석 문서로 바꾸는 것이다.

## 현재 상황

기존 버전은 3000줄 이상의 단일 JavaScript 파일로 만들어졌다.

이 코드는 처음부터 설계문서를 기준으로 작성된 것이 아니라, 여러 사이트를 수동으로 테스트하면서 틀리는 부분을 그때그때 고쳐가며 발전했다.

그래서 기존 코드 안에는 실제 사이트를 분석하며 쌓은 중요한 규칙과 예외처리가 들어 있다.

하지만 동시에 다음 문제가 있을 수 있다.

- 함수 간 의존성이 숨겨져 있을 수 있다.
- 같은 역할의 코드가 여러 곳에 흩어져 있을 수 있다.
- 임시 예외처리가 누적되어 있을 수 있다.
- 어떤 코드가 필수이고 어떤 코드가 우연히 남은 것인지 구분하기 어렵다.
- 단일 파일 내부 scope에 의존하는 구조가 남아 있을 수 있다.

따라서 v2는 기존 3000줄 코드를 그대로 쪼개는 방식으로 진행하지 않는다.

## v2 개발 방향

v2는 기존 코드를 직접 리팩터링하는 작업이 아니다.

v2는 설계문서 기준으로 새 구조에서 다시 작성하는 clean rewrite다.

다만 기존 코드에 쌓인 분석 규칙과 예외처리는 버리지 않는다.

기존 안정 버전은 다음 위치에 보존한다.

`legacy/analyzeSelectedElementReadable.stable.js`

이 파일은 수정 대상이 아니다.

이 파일은 v2의 검증 기준이자 heuristic 참고 자료로 사용한다.

즉, 방향은 다음과 같다.

- 기존 코드는 legacy oracle로 보존한다.
- v2 코드는 새 아키텍처 기준으로 작성한다.
- 기존 코드의 좋은 규칙은 문서화한 뒤 v2에 다시 구현한다.
- v2 결과는 legacy fixture와 비교한다.
- 기존 코드를 그대로 여러 파일로 흩뿌리지 않는다.

한 문장으로 정리하면 다음과 같다.

코드는 새로 짜고, 경험은 버리지 않는다.

## v2 목표

v2의 목표는 기능 확장이 아니라 안정적인 재구성이다.

주요 목표는 다음과 같다.

- 기존 public API를 유지한다.
- 기존 Markdown 출력 포맷을 유지한다.
- 기존 코드에 쌓인 분석 경험을 보존한다.
- 새 코드에서는 명확한 모듈 경계를 만든다.
- 모듈 간 의존성은 context로 전달한다.
- `analyzer.js`는 전체 흐름만 담당하게 만든다.
- `index.js`는 public API 연결만 담당하게 만든다.
- role 판별 로직은 충분히 안정화된 뒤 나눈다.
- 수동 테스트를 자동화 가능한 fixture와 smoke test로 바꾼다.

## 유지해야 하는 것

v2에서도 다음은 유지한다.

- `analyzeSelectedElementReadable(root = $0)` public API
- 기존 Markdown 출력 섹션
- Annotated Structure 중심의 메인 출력 방식
- Raw Details를 검증용으로 접어서 보관하는 방식
- 숨겨진 레이어를 기본 분석에서 제외하는 규칙
- `display: contents` wrapper는 생략하되 children은 분석하는 규칙
- 장식용 SVG는 메인 구조에서 숨기는 규칙
- solid `rgb(...)`를 HEX로 변환하는 규칙
- `rgba(...)`와 shadow는 원문 또는 축약 형태로 보존하는 규칙
- width 숫자보다 width behavior를 우선하는 방향

## v2에서 하지 않을 것

v2 초기 단계에서는 다음을 하지 않는다.

- 기존 3000줄 파일을 그대로 여러 파일로 분리
- 출력 포맷 전면 변경
- UI 개발
- Chrome Extension 패널 개발
- screenshot 기능 추가
- hover/focus 상태 분석
- role 알고리즘 전면 재작성
- `inferRole` 선분리
- 복잡한 build system 추가
- legacy 안정 파일 삭제

초기 목표는 더 많은 기능이 아니라, 깨끗하고 검증 가능한 구조다.

## 핵심 사용 흐름

사용 흐름은 다음과 같다.

1. 사용자가 DevTools에서 분석할 요소를 선택한다.
2. 콘솔에서 `analyzeSelectedElementReadable($0)`를 실행한다.
3. 도구가 선택 요소와 하위 요소를 분석한다.
4. Markdown 리포트를 반환한다.
5. 사용자는 결과를 Obsidian 또는 문서에 저장한다.

## 주요 분석 대상

초기 주요 분석 대상은 웹사이트 헤더다.

특히 다음 요소들을 안정적으로 분석하는 것이 중요하다.

- Header
- Container
- Navigation
- Logo
- Nav Item
- Button
- Link
- CTA Group
- Typography
- Raw computed details

추후 섹션, 카드, 히어로, 푸터 등으로 확장할 수 있다.

## 테스트 방향

기존에는 5~10개 사이트를 수동으로 테스트했다.

v2에서는 이 과정을 자동화 가능한 테스트 구조로 바꾼다.

초기 테스트 방향은 다음과 같다.

- 5~10개 핵심 사이트는 fixture로 고정한다.
- 20~50개 사이트는 smoke test로 자동 실행한다.
- 이후 100개 이상 사이트에서 regression test를 진행한다.
- 500~1000개 사이트 테스트는 품질 스캔과 실패 패턴 수집용으로 사용한다.

대량 테스트의 목적은 완벽한 정답 비교가 아니다.

목적은 런타임 에러, role 오판, hidden layer 누락, SVG 오염, typography 누락 같은 실패 패턴을 발견하는 것이다.

## Fixture 기준

큰 리팩터링 전에는 안정 파일과 기준 출력을 보존한다.

권장 구조는 다음과 같다.

- `legacy/analyzeSelectedElementReadable.stable.js`
- `fixtures/stripe-header.md`
- `fixtures/vercel-header.md`
- `fixtures/linear-header.md`

v2 출력이 fixture와 완전히 같을 필요는 없다.

하지만 다음은 유지되어야 한다.

- 필수 Markdown 섹션
- 주요 role 판별
- typography 수집
- hidden element 처리
- display: contents 처리
- decorative SVG 처리
- Raw Details 역할

## 작업 원칙

v2 작업은 작은 단위로 진행한다.

- 문서 먼저
- 계약 먼저
- fixture 먼저
- smoke test 먼저
- clean rewrite
- 모듈 분리는 단계적으로
- 임시 alias 금지
- 기존 동작 보존 우선

코드 작성 전에 관련 context 문서를 먼저 업데이트한다.

## 성공 기준

v2가 성공했다고 판단하는 기준은 다음과 같다.

- `analyzeSelectedElementReadable($0)`가 계속 동작한다.
- 기존 Markdown 출력 섹션이 유지된다.
- legacy fixture와 큰 차이가 없다.
- 런타임 에러가 없다.
- `index.js`에 임시 alias가 없다.
- `analyzer.js`에 세부 분석 로직이 없다.
- 모듈은 필요한 의존성을 context로만 받는다.
- Raw Details는 검증용 역할을 유지한다.
- 자동 smoke test로 여러 사이트에서 깨지지 않음을 확인할 수 있다.

## 다음 단계

현재는 구현 단계가 아니다.

다음 순서로 context 문서를 하나씩 작성한다.

1. `project-overview.md`
2. `output-contract.md`
3. `public-api.md`
4. `fixture-plan.md`
5. `architecture.md`
6. `module-map.md`
7. `code-standards.md`
8. `refactor-plan.md`
9. `runtime-checklist.md`
10. `progress-tracker.md`