# Output Contract

## 목적

이 문서는 DevTools Design Analyzer v2의 Markdown 출력 계약을 정의한다.

v2는 clean rewrite로 작성하더라도, 사용자가 받아보는 Markdown 리포트의 핵심 구조는 유지해야 한다.

출력 포맷은 구현 세부사항이 아니라 public contract로 본다.

## 기본 원칙

Markdown 리포트는 사람이 읽고 정리하기 쉬워야 한다.

주요 목적은 다음과 같다.

- 선택한 요소의 핵심 정보를 빠르게 파악한다.
- 하위 구조를 역할 중심으로 읽는다.
- 타이포그래피 정보를 별도로 확인한다.
- 세부 computed data는 Raw Details에서 검증한다.
- 메인 출력은 읽기 쉽게 축약하되, 원본 DOM 추적성은 유지한다.

v2 리팩터링 중에는 출력 포맷을 임의로 바꾸지 않는다.

## 필수 섹션

최종 Markdown 리포트는 반드시 다음 섹션을 포함해야 한다.

- `## Selected Element`
- `## Child Elements — Annotated Structure`
- `## Typography`
- `<details><summary>Raw Details</summary>`

섹션 이름은 가능하면 그대로 유지한다.

Codex나 에이전트가 임의로 제목을 바꾸면 안 된다.

## 전체 출력 구조

기본 출력 구조는 다음 순서를 따른다.

```md
## Selected Element

...

## Child Elements — Annotated Structure

...

## Typography

...

<details>
<summary>Raw Details</summary>

...

</details>
```

이 순서는 유지한다.

새 섹션이 필요하면 v2 안정화 이후 별도 버전에서 논의한다.

## Selected Element

`Selected Element`는 사용자가 선택한 root 요소의 요약 정보다.

포함할 수 있는 정보는 다음과 같다.

- element role
- tag name
- selector
- text summary
- size summary
- layout summary
- visual summary

이 섹션은 너무 길어지면 안 된다.

자세한 computed data는 Raw Details에 둔다.

## Child Elements — Annotated Structure

`Child Elements — Annotated Structure`는 메인 분석 결과다.

이 섹션은 DOM을 그대로 덤프하는 곳이 아니다.

역할과 구조를 사람이 읽기 쉽게 요약한다.

중요한 방향은 다음과 같다.

- class name보다 role 중심으로 표시한다.
- 의미 있는 layout, spacing, typography, visual 정보만 표시한다.
- 분석 대상의 구조적 관계는 유지한다.
- width는 숫자보다 behavior 중심으로 표시한다.
- 불필요한 wrapper는 생략할 수 있다.
- 단, 생략된 wrapper도 원본 추적이 가능해야 한다.

예시 role:

- Header
- Container
- Navigation
- Logo
- Nav Item
- Link
- Button
- CTA Group
- Icon
- Text

## Wrapper 처리 원칙

Annotated Structure에서는 읽기 쉽게 불필요한 wrapper를 생략할 수 있다.

하지만 wrapper를 완전히 삭제하는 것이 아니다.

메인 출력에서는 축약하더라도, Raw Details나 Source Path에서 원본 DOM 구조를 추적할 수 있어야 한다.

즉, 목표는 다음과 같다.

- Annotated Structure는 읽기 쉽게 만든다.
- Raw Details는 원본 검증이 가능하게 만든다.
- 생략된 wrapper는 필요 시 추적 가능하게 남긴다.

## 생략할 수 있는 Wrapper

다음 wrapper는 Annotated Structure에서 생략할 수 있다.

- `display: contents`
- 시각적 크기나 스타일이 거의 없는 wrapper
- 단순 framework wrapper
- 의미 없는 `div`
- 자식 하나만 감싸는 pass-through wrapper
- layout에 영향이 거의 없는 wrapper

단, 생략하더라도 children은 반드시 계속 분석해야 한다.

## 생략하면 안 되는 Wrapper

다음 wrapper는 Annotated Structure에서 생략하지 않는다.

- padding을 가진 wrapper
- max-width를 가진 container
- background, border, radius가 있는 wrapper
- flex/grid layout을 만드는 wrapper
- position 기준이 되는 wrapper
- overflow 또는 clipping을 담당하는 wrapper
- sticky/fixed/relative 기준 wrapper
- semantic role이 있는 wrapper
- 실제 클릭 영역을 가진 wrapper
- accessibility role이 있는 wrapper

특히 Section, Container, Shell, Grid, Flex wrapper는 디자인 구현에서 중요한 경우가 많으므로 신중하게 보존한다.

## Source Path

원본 DOM과 비교할 수 있도록 Raw Details에는 Source Path를 남길 수 있다.

예시:

```md
Source Path:
header > div.relative > div.container > nav
```

Source Path는 Annotated Structure에서 wrapper가 축약되었을 때 특히 중요하다.

## Skipped Wrappers

Annotated Structure에서 wrapper를 생략했다면, Raw Details에 생략 이유를 남길 수 있다.

예시:

```md
Skipped Wrappers:
- div.relative — layout 영향 없음, visible content 없음
- div.contents-wrapper — display: contents
```

Skipped Wrappers는 디버깅과 원본 사이트 비교를 위한 검증 정보다.

## Typography

`Typography`는 선택 영역 안에서 실제로 보이는 텍스트 스타일을 요약한다.

포함할 수 있는 정보는 다음과 같다.

- text sample
- font family
- font size
- line height
- font weight
- letter spacing
- color
- text transform

숨겨진 텍스트는 Typography에 포함하지 않는다.

닫힌 메뉴, 모바일 레이어, `aria-hidden`, `inert`, `display: none`, `visibility: hidden`, `opacity: 0` 텍스트는 제외한다.

## Raw Details

`Raw Details`는 검증용 세부 정보다.

이 섹션은 기본적으로 `<details>` 안에 접어서 보관한다.

목적은 다음과 같다.

- Annotated Structure가 생략한 원본 정보를 확인한다.
- computed style 값을 검증한다.
- selector, class, raw size, raw spacing을 확인한다.
- Source Path를 통해 원본 DOM 위치를 추적한다.
- Skipped Wrappers를 통해 생략된 wrapper를 확인한다.
- hidden 또는 decorative로 판단된 요소를 필요 시 추적한다.

Raw Details는 메인 분석 결과가 아니다.

메인 판단은 Annotated Structure가 담당한다.

## Hidden Element 처리

기본 분석에서는 숨겨진 요소를 제외한다.

Annotated Structure와 Typography에서 제외할 대상은 다음과 같다.

- `display: none`
- `visibility: hidden`
- `visibility: collapse`
- `opacity: 0`
- `hidden` attribute
- `aria-hidden="true"`
- `inert`
- closed dialog
- closed popover
- hidden mobile menu
- decorative overlay
- decorative mask
- decorative background SVG

Raw Details에는 검증 목적상 일부 생략 요소가 남을 수 있다.

## display: contents 처리

`display: contents` wrapper는 Annotated Structure에서 생략할 수 있다.

하지만 그 children은 반드시 계속 분석해야 한다.

wrapper를 생략한다는 이유로 하위 요소를 누락하면 안 된다.

생략된 `display: contents` wrapper는 Raw Details 또는 Skipped Wrappers에서 추적 가능해야 한다.

## SVG 처리

SVG는 의미 있는 것과 장식용을 구분한다.

Annotated Structure에 표시할 수 있는 SVG:

- logo SVG
- button icon
- content icon
- 실제 의미가 있는 inline SVG

Annotated Structure에서 숨길 수 있는 SVG:

- mask
- gradient background
- overlay
- decorative shape
- hidden sprite
- symbol definition
- zero-size SVG

장식용 SVG는 필요하면 Raw Details에만 남긴다.

## Color Formatting

색상 표기는 기존 동작을 유지한다.

- solid `rgb(...)`는 HEX로 변환한다.
- `rgba(...)`는 원문을 유지한다.
- gradient는 원문 유지 또는 축약한다.
- shadow는 원문 유지 또는 `present`로 축약한다.

예시:

- `rgb(255, 255, 255)` → `#FFFFFF`
- `rgba(0, 0, 0, 0.1)` → `rgba(0, 0, 0, 0.1)`

## Width Formatting

width는 가능하면 raw pixel보다 behavior 중심으로 표시한다.

권장 label:

- `viewport-fill`
- `parent-fill`
- `content-fit`
- `content-sized-group`
- `max-width-constrained`
- `flex-slot`
- `asset`
- `asset-svg`
- `unknown`

브라우저 viewport에 따라 바뀌는 숫자를 고정 구현값처럼 보이게 하면 안 된다.

## Spacing Formatting

spacing은 필요한 경우에만 표시한다.

표시할 수 있는 값:

- padding
- margin
- border
- gap
- row gap
- column gap
- flex-specific spacing

기본값이거나 의미 없는 0 값은 과하게 반복하지 않는다.

## Visual Formatting

visual 정보는 의미 있을 때만 표시한다.

표시할 수 있는 값:

- background
- border
- radius
- shadow
- opacity
- image
- gradient

장식용 visual이 구조 분석을 방해하면 Raw Details로 보낸다.

## Output에서 하지 말 것

v2 리팩터링 중에는 다음을 하지 않는다.

- 섹션 이름 임의 변경
- 섹션 순서 변경
- Raw Details를 기본 펼침 구조로 변경
- Typography에 hidden text 포함
- Decorative SVG를 메인 구조에 과하게 노출
- viewport-dependent width를 고정값처럼 표시
- DOM 전체를 무조건 그대로 출력
- class name 중심 구조로 회귀
- wrapper를 생략하면서 원본 추적 정보까지 제거
- layout에 중요한 wrapper를 단순 wrapper로 오판해 생략
- 분석 결과를 과도하게 표로만 구성

## 성공 기준

출력 계약이 지켜졌다고 판단하는 기준은 다음과 같다.

- 필수 섹션이 모두 존재한다.
- Annotated Structure가 메인 분석 결과로 읽힌다.
- Typography에 실제 보이는 텍스트만 포함된다.
- Raw Details가 검증용 역할을 한다.
- 생략된 wrapper를 Source Path 또는 Skipped Wrappers로 추적할 수 있다.
- layout에 중요한 wrapper가 메인 구조에서 보존된다.
- hidden layer가 메인 출력에 섞이지 않는다.
- decorative SVG가 메인 구조를 오염시키지 않는다.
- width는 behavior 중심으로 표현된다.
- 기존 fixture와 주요 구조가 크게 다르지 않다.