# Fixture Plan

## 목적

이 문서는 DevTools Design Analyzer v2의 fixture와 테스트 기준을 정의한다.

v2는 clean rewrite로 작성하지만, 기존 안정 버전의 분석 경험은 버리지 않는다.

기존 코드는 수정 대상이 아니라 검증 기준으로 사용한다.

## 핵심 원칙

기존 3000줄 단일 파일은 legacy oracle로 보존한다.

v2는 새 아키텍처로 작성한다.

v2 결과는 legacy fixture와 비교한다.

목표는 완전한 문자열 일치가 아니라, 중요한 분석 품질을 유지하는 것이다.

## 기본 구조

권장 파일 구조는 다음과 같다.

- `legacy/analyzeSelectedElementReadable.stable.js`
- `fixtures/manual/stripe-header.md`
- `fixtures/manual/vercel-header.md`
- `fixtures/manual/linear-header.md`
- `fixtures/smoke/sites.json`
- `fixtures/results/`

`legacy/` 파일은 수정하지 않는다.

`fixtures/manual/`은 사람이 검토한 기준 출력이다.

`fixtures/smoke/`는 자동 테스트 대상 목록이다.

`fixtures/results/`는 자동 실행 결과를 저장하는 곳이다.

## Legacy 파일

기존 안정 버전은 다음 위치에 보존한다.

- `legacy/analyzeSelectedElementReadable.stable.js`

이 파일은 v2 구현 중 수정하지 않는다.

역할은 다음과 같다.

- 기존 분석 결과 기준
- heuristic 참고 자료
- fixture 생성용 실행 파일
- v2 결과 비교 대상

기존 코드를 그대로 모듈로 쪼개지 않는다.

필요한 규칙은 문서화한 뒤 v2에 다시 구현한다.

## Manual Fixture

초기 fixture는 직접 확인한 핵심 사이트로 만든다.

우선 대상:

- Stripe header
- Vercel header
- Linear header

추가 후보:

- GitHub header
- Notion header
- Webflow header
- Framer header
- Tailwind CSS header

manual fixture는 적게 시작한다.

많이 만드는 것보다 정확한 기준을 만드는 것이 먼저다.

## Manual Fixture 목적

manual fixture는 다음을 검증한다.

- 필수 Markdown 섹션이 유지되는가
- Header, Container, Navigation, Logo, Button role이 크게 깨지지 않는가
- Annotated Structure가 읽기 쉬운가
- Typography에 실제 보이는 텍스트만 포함되는가
- hidden layer가 메인 출력에 섞이지 않는가
- decorative SVG가 메인 구조를 오염시키지 않는가
- Raw Details가 원본 검증 역할을 하는가
- Source Path 또는 Skipped Wrappers로 원본 추적이 가능한가

## 비교 기준

fixture 비교는 완전한 문자열 일치를 목표로 하지 않는다.

완전 일치가 필요한 것:

- 필수 섹션 이름
- 섹션 순서
- public API 반환값이 Markdown string인 것
- Raw Details가 `<details>` 안에 있는 것

완전 일치하지 않아도 되는 것:

- selector 세부 문자열
- class name 순서
- pixel 값의 미세한 차이
- viewport에 따라 달라지는 width 값
- 텍스트 샘플의 일부 축약
- 날짜, 사용자 이름, 뉴스 제목, 랜덤 해시값, 실시간 카운트처럼 방문 시점마다 동적으로 변하는 텍스트 샘플
- Raw Details의 세부 순서

중요한 것은 분석 의미가 유지되는 것이다.

## Smoke Test

smoke test는 많은 사이트에서 도구가 깨지지 않는지 확인하는 테스트다.

초기 목표는 20~50개 사이트다.

검증 기준은 단순하게 유지한다.

- 런타임 에러가 없어야 한다.
- Markdown string을 반환해야 한다.
- 필수 섹션이 존재해야 한다.
- 결과가 지나치게 짧으면 안 된다.
- hidden text가 Typography에 대량으로 섞이면 안 된다.
- 전체 role이 대부분 unknown이면 실패로 본다.

smoke test는 정확한 디자인 판단보다 안정성 확인이 목적이다.

## Regression Test

regression test는 v2 변경 후 기존 품질이 떨어졌는지 확인한다.

초기 목표는 100개 내외 사이트다.

검증 기준은 다음과 같다.

- 이전 실행보다 런타임 에러가 늘지 않아야 한다.
- role unknown 비율이 크게 증가하지 않아야 한다.
- Typography 수집 실패가 늘지 않아야 한다.
- hidden layer 오염이 늘지 않아야 한다.
- decorative SVG 오염이 늘지 않아야 한다.

Regression test는 동적 텍스트의 완전 일치보다 구조, role, 섹션 존재, hidden 처리, typography 수집 여부를 우선 비교한다.

regression test는 품질 하락을 잡는 용도다.

## Scale Scan

scale scan은 500~1000개 사이트에서 실패 패턴을 수집하는 테스트다.

목적은 정답 비교가 아니다.

목적은 다음 실패 유형을 찾는 것이다.

- 특정 프레임워크에서 구조 분석 실패
- 로고 오판
- nav 오판
- button/link 오판
- hidden mobile menu 노출
- decorative SVG 노출
- typography 누락
- layout wrapper 누락
- Raw Details 추적 실패

scale scan 결과는 heuristic 개선 자료로 사용한다.

## 자동화 방향

자동화 테스트는 Playwright 기반으로 진행할 수 있다.

기본 흐름은 다음과 같다.

1. 사이트에 접속한다.
2. 분석 스크립트를 page에 inject한다.
3. `header`, `nav`, `[role="banner"]` 같은 후보 요소를 찾는다.
4. `analyzeSelectedElementReadable(element)`를 실행한다.
5. Markdown 결과를 저장한다.
6. 필수 섹션과 런타임 에러를 검사한다.
7. 실패 케이스를 유형별로 분류한다.

자동화 테스트에서는 `$0`에 의존하지 않는다.

항상 root element를 명시적으로 전달한다.

## Selector 후보

자동 테스트에서 우선 시도할 selector는 다음과 같다.

- `header`
- `nav`
- `[role="banner"]`
- `[role="navigation"]`
- `main`
- `button`
- `a[href]`

초기 자동 테스트는 header 중심으로 진행한다.

section, card, hero, footer 테스트는 v2 안정화 이후 확장한다.

## 실패 유형 분류

실패는 다음 유형으로 분류한다.

- `runtime-error`
- `missing-section`
- `empty-output`
- `invalid-root`
- `role-unknown`
- `logo-detection`
- `nav-detection`
- `button-link-detection`
- `hidden-layer-leak`
- `decorative-svg-leak`
- `typography-missing`
- `wrapper-trace-missing`
- `raw-details-missing`
- `dynamic-text-diff`

실패 유형을 분류해야 같은 문제가 반복되는지 추적할 수 있다.

## 품질 지표

자동 테스트에서는 다음 지표를 기록할 수 있다.

- 실행 성공 여부
- Markdown 길이
- 필수 섹션 존재 여부
- role unknown 비율
- Typography 항목 수
- Raw Details 존재 여부
- hidden 후보 노출 여부
- decorative SVG 노출 여부
- Source Path 존재 여부
- Skipped Wrappers 존재 여부
- 동적 텍스트 차이 여부

지표는 품질 변화를 추적하기 위한 참고 자료다.

## 통과 기준

manual fixture 통과 기준:

- 필수 섹션이 모두 존재한다.
- 주요 구조와 role이 legacy와 크게 다르지 않다.
- 사람이 읽었을 때 분석 노트로 사용할 수 있다.
- Raw Details로 원본 검증이 가능하다.

smoke test 통과 기준:

- 런타임 에러가 없다.
- Markdown string을 반환한다.
- 필수 섹션이 존재한다.
- 결과가 비어 있지 않다.

regression test 통과 기준:

- 이전 기준보다 주요 품질 지표가 악화되지 않는다.
- 동적 텍스트 차이만으로 실패 처리하지 않는다.
- 새 실패 유형이 생기면 progress-tracker에 기록한다.

## 하지 않을 것

초기 v2에서는 다음을 하지 않는다.

- 1000개 사이트를 먼저 돌리기
- 모든 fixture를 문자열 완전 일치로 비교하기
- 날짜, 사용자 이름, 뉴스 제목 같은 동적 텍스트 차이만으로 regression 실패 처리하기
- 자동 테스트 결과만 보고 heuristic을 무조건 수정하기
- legacy 파일을 테스트 편의를 위해 수정하기
- fixture가 안정되기 전에 대규모 리팩터링하기
- 테스트 실패를 index.js alias로 우회하기

## 성공 기준

fixture 계획이 성공했다고 판단하는 기준은 다음과 같다.

- legacy 안정 파일이 보존되어 있다.
- 최소 3개 manual fixture가 있다.
- smoke test 대상 목록이 있다.
- 필수 섹션 검증 기준이 있다.
- 실패 유형 분류 기준이 있다.
- 동적 텍스트 차이를 허용하는 기준이 있다.
- v2 결과를 legacy와 비교할 수 있다.
- 대량 테스트는 품질 스캔 목적으로 분리되어 있다.

## 다음 단계

fixture-plan.md 이후에는 architecture.md를 작성한다.

architecture.md에서는 v2의 폴더 구조, namespace, 모듈 책임, 데이터 흐름을 정의한다.