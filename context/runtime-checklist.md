# Runtime Checklist

## 목적

이 문서는 DevTools Design Analyzer v2 구현/수정 후 확인해야 할 runtime 체크리스트를 정의한다.

목표는 “일단 된 것 같다”에서 멈추지 않고 public API, output contract, fixture, runtime 안정성을 확인하는 것이다.

## 핵심 원칙

- runtime check 전에는 완료로 보지 않는다.
- 각 Phase가 끝날 때 최소 1개 quick check를 실행한다.
- Phase 10은 처음 확인하는 단계가 아니라 종합 fixture 비교 단계다.
- 자동 테스트에서는 `$0`에 의존하지 않는다.
- root element를 명시적으로 전달한다.
- 실패는 숨기지 않고 기록한다.
- legacy 파일은 수정하지 않는다.

## 기본 확인 순서

1. 스크립트 로드
2. namespace 확인
3. public API 확인
4. invalid root 확인
5. selected root 분석
6. `document.body` 분석
7. 필수 Markdown 섹션 확인
8. console runtime error 확인
9. fixture quick check
10. progress tracker 기록

## DevTools 기본 확인

```js
typeof window.DA
typeof window.analyzeSelectedElementReadable
typeof window.DA.analyzeSelectedElementReadable
```

기대값:

```txt
"object"
"function"
"function"
```

## Public API 확인

```js
analyzeSelectedElementReadable($0)
analyzeSelectedElementReadable()
analyzeSelectedElementReadable(document.body)
analyzeSelectedElementReadable(document.querySelector("header"))
```

통과 기준:

- 함수가 실행된다.
- 반환값은 Markdown string이다.
- `$0`가 없어도 ReferenceError가 발생하지 않는다.
- invalid root에 명확한 에러를 제공한다.

## Invalid Root 확인

다음 호출은 원시 JS 에러가 아니라 명확한 실패 메시지를 반환해야 한다.

```js
analyzeSelectedElementReadable(null)
analyzeSelectedElementReadable(undefined)
analyzeSelectedElementReadable("header")
analyzeSelectedElementReadable({})
analyzeSelectedElementReadable([])
analyzeSelectedElementReadable(document)
```

권장 메시지:

```txt
DevTools Design Analyzer: valid root element is required. Select an element in DevTools or pass a DOM Element.
```

실패 예시:

```txt
ReferenceError: $0 is not defined
Cannot read properties of undefined
root.querySelectorAll is not a function
```

## Markdown Output 확인

```js
const result = analyzeSelectedElementReadable(document.body)

typeof result
result.includes("## Selected Element")
result.includes("## Child Elements — Annotated Structure")
result.includes("## Typography")
result.includes("<details>")
result.includes("<summary>Raw Details</summary>")
```

통과 기준:

- `typeof result === "string"`
- 필수 섹션이 모두 존재한다.
- Raw Details는 `<details>` 안에 있다.
- Annotated Structure가 class dump처럼 보이지 않는다.
- Typography에 hidden text가 대량으로 섞이지 않는다.

## Context / Cache Static Check

Phase 4 완료 전에는 context 직접 mutation 의심 패턴을 검색한다.

```bash
CODE_DIR=src

grep -RIn "context\.[a-zA-Z0-9_]*\s*=" "$CODE_DIR"
grep -RIn "context\.[a-zA-Z0-9_]*\.[a-zA-Z0-9_]*\s*=" "$CODE_DIR"
grep -RIn "context\.cache\s*=" "$CODE_DIR"
```

`CODE_DIR`은 실제 프로젝트 구조에 맞게 조정한다.

검색 결과가 없더라도 먼저 경로가 맞는지 확인한다.

통과 기준:

- `context.options`, `context.limits`, `context.dom`, `context.roles`, `context.formatters`를 직접 수정하지 않는다.
- `context.cache = {}` 같은 교체가 없다.
- cache 갱신은 정해진 helper 내부에서만 한다.
- DOM Element key cache는 기본적으로 `WeakMap`을 사용한다.
- 문자열/primitive key가 필요한 경우에만 `Map`을 사용한다.

메모:

- 안정화 후 `options`, `limits`, helper registry 객체는 `Object.freeze`를 검토한다.
- cache 내부 WeakMap은 freeze하지 않는다.

## Phase별 Quick Check

| Phase | 확인 대상 | 최소 통과 기준 |
|---|---|---|
| Phase 2 Public API | `window.DA`, public API, `$0` fallback | API 존재, ReferenceError 없음, invalid root 메시지 |
| Phase 3 Minimum Markdown | Markdown string, 필수 섹션 | 필수 섹션 모두 존재 |
| Phase 4 Context | context/cache | direct mutation 없음, 전역 cache 없음 |
| Phase 5 DOM Helper | style/rect/visibility/selector/source path | DOM read가 `context.dom` helper 경유 |
| Phase 6 Selected Element | root 요약 | role/tag/selector/size/source path 표시 |
| Phase 7 Child Tree | Annotated Structure | Header/Container/Nav/Button 등 주요 구조 표시 |
| Phase 8 Typography | visible text style | hidden text 제외, Typography 비어 있지 않음 |
| Phase 9 Raw Details | 원본 검증 정보 | `<details>` 안에 있고 Source Path 추적 가능 |
| Phase 10 Manual Fixture | Stripe/Vercel/Linear | 주요 role 유지, hidden/decorative 오염 없음 |
| Phase 11 Smoke Test | 20~50개 사이트 | runtime error 없음, 필수 섹션 존재 |

## Phase 6~9 Fixture Quick Check

Phase 10까지 기다리지 말고 각 단계마다 최소 1개 fixture를 확인한다.

권장:

- Phase 6: Stripe 또는 Vercel header 1개
- Phase 7: Stripe / Vercel / Linear 중 1개 이상
- Phase 8: nav text와 CTA button이 있는 header
- Phase 9: wrapper가 있는 header

실패 기준:

- root가 `unknown`만 나옴
- DOM 전체 dump처럼 출력됨
- hidden mobile menu가 메인 구조에 섞임
- Typography에 숨겨진 텍스트가 섞임
- Raw Details로 원본 추적이 불가능함

## Phase 10 — Manual Fixture Check

대상:

- Stripe header
- Vercel header
- Linear header

비교 기준:

- 완전한 문자열 일치가 목표가 아니다.
- 필수 섹션은 유지되어야 한다.
- 주요 role 의미가 유지되어야 한다.
- hidden / decorative 오염이 없어야 한다.
- Raw Details가 검증용으로 남아야 한다.
- 동적 텍스트 차이만으로 실패 처리하지 않는다.

통과 기준:

- 최소 3개 manual fixture와 비교했다.
- 큰 품질 하락이 없다.
- 차이가 있으면 progress tracker에 기록했다.

## Phase 11 — Smoke Test 기준

대상:

- `fixtures/smoke/sites.json`
- 초기 20~50개 사이트

자동 테스트 기준:

- `$0`에 의존하지 않는다.
- root element를 명시적으로 전달한다.
- `dist/analyzer.dev.js` 또는 build 결과물을 inject한다.
- 결과를 저장한다.

초기 통과 기준:

- 런타임 에러 없음
- Markdown string 반환
- 필수 섹션 존재
- Markdown 길이 800자 이상
- Markdown 줄 수 20줄 이상
- 주요 role이 일부라도 잡힘

초기 의심 기준:

- Markdown 길이 800자 미만
- Markdown 줄 수 20줄 미만
- Annotated Structure의 role 중 `unknown` 비율이 60% 이상

초기 실패 기준:

- 필수 섹션 중 하나라도 없음
- Header / Container / Navigation / Button / Link 중 주요 role이 하나도 없음
- raw stack trace만 반환
- console runtime error 발생

위 숫자는 초기 기준이며 fixture 결과를 보며 조정한다.

## Unknown 처리 기준

`unknown`은 node 단위 fallback으로는 허용한다.

하지만 전체 tree에서 주요 구조가 대부분 `unknown`이면 실패 또는 의심으로 본다.

기준:

- 단일 node의 `unknown` → 허용
- 주요 구조가 모두 `unknown` → 실패
- role 중 `unknown` 비율 60% 이상 → 의심

## Console Error 확인

분석 실행 후 Console에 새 에러가 없어야 한다.

실패로 보는 에러:

- `ReferenceError`
- `TypeError`
- `Cannot read properties of undefined`
- `$0 is not defined`
- module missing error
- helper missing error
- raw stack trace만 남는 analyzer error

허용 가능한 것:

- 명확한 invalid root 메시지
- Raw Details 안의 짧은 fallback note
- 특정 node 단위의 `unknown` 또는 `error`

## Partial Failure 확인

일부 node나 section이 실패해도 가능한 한 전체 리포트는 반환되어야 한다.

기준:

- root validation 실패 → 전체 실패 가능
- child tree 일부 실패 → 해당 node만 fallback
- typography 실패 → Typography 섹션 fallback
- raw details 실패 → Raw Details fallback
- markdown render 실패 → 명확한 analyzer error

실패를 완전히 숨기지 않는다.

Raw Details 또는 fallback note에 짧게 남긴다.

## Failure 기록

실패는 progress tracker에 유형별로 기록한다.

대표 유형:

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

## 완료 기준

작업 완료 기준은 다음과 같다.

- public API가 동작한다.
- Markdown string을 반환한다.
- 필수 출력 섹션이 존재한다.
- invalid root에 명확한 에러를 제공한다.
- console runtime error가 없다.
- DOM read는 context helper를 통해 수행된다.
- DOM Element key cache는 WeakMap을 사용한다.
- context를 직접 mutate하지 않았다.
- legacy 파일을 수정하지 않았다.
- 관련 fixture 또는 runtime check를 통과했다.
- progress tracker를 업데이트했다.