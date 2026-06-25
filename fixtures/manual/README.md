# Manual Fixture

## 목적

`header-basic.html`은 Chrome DevTools에서 수동으로 analyzer 출력을 확인하기 위한 로컬 fixture다.

빌드, 외부 라이브러리, npm install 없이 브라우저에서 직접 연다.

## 포함 요소

- 선택 가능한 `header` root
- header container
- logo link
- navigation list
- nav link 여러 개
- primary / secondary CTA link
- Typography에 나오면 안 되는 hidden text
- output에 나오면 안 되는 `script`, `style`, `template` text
- typography, spacing, fixed size, border, background, gap, button style 확인용 CSS

## 수동 확인 순서

1. Chrome에서 `fixtures/manual/header-basic.html`을 연다.
2. DevTools를 연다.
3. 최신 `dist/analyzer.dev.js`를 Snippet으로 로드한다.
4. Elements 패널에서 `header#fixture-header`를 선택한다.
5. Console에서 아래 명령을 실행한다.

```js
const result = analyzeSelectedElementReadable($0);
result
```

## 기본 계약 확인

```js
[
  typeof result,
  result.includes("## Selected Element"),
  result.includes("## Child Elements — Annotated Structure"),
  result.includes("## Typography"),
  result.includes("<details><summary>Raw Details</summary>"),
  result.includes("Minimum Raw Details placeholder."),
  result.includes("Typography collection is not implemented yet."),
  result.includes("Child analysis is not implemented yet.")
]
```

기대값:

```js
["string", true, true, true, true, false, false, false]
```

## Fixture Text 확인

```js
[
  result.includes("Acme"),
  result.includes("Product"),
  result.includes("Resources"),
  result.includes("Customers"),
  result.includes("Pricing"),
  result.includes("Log in"),
  result.includes("Sign up"),
  result.includes("Hidden Mobile Menu"),
  result.includes("Invisible Tracking Text"),
  result.includes("Template Hidden Text"),
  result.includes("Script Hidden Text"),
  result.includes("Style Hidden Text")
]
```

기대값:

- visible label은 `true`
- hidden / script / style / template label은 `false`
- visible label이 `Selected Element` text summary에만 있고 `Typography`에는 없으면 별도 기록한다.

## Raw Details 확인

```js
[
  result.includes("Raw Rect"),
  result.includes("Layout:"),
  result.includes("Visual:"),
  result.includes("Typography:"),
  result.includes("Spacing:"),
  result.includes("Children:")
]
```

기대값:

```js
[true, true, true, true, true, true]
```
