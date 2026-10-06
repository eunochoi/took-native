# Took Native 스타일 작성 원칙

- 프로젝트의 화면 및 컴포넌트 스타일은 NativeWind `className`을 기본으로 작성한다.
- ScrollView / FlatList의 내부 배치는 `contentContainerClassName`을 사용한다.
- 애니메이션 값, 데이터에 따른 차트 높이, 이미지 원본 비율, 측정한 크기 등 실행 중 계산하는 값은 `style`에 남긴다.
- NativeWind가 Android에서 지원하지 않는 속성은 필요한 범위에서 `style`을 사용한다. 현재 로컬 Image의 `height: 'auto'`는 원본 높이 확대를 막기 위해 명시적으로 유지한다.
- 고정 색상은 `theme-*` 토큰을 사용한다. 폰트 굵기는 웹처럼 `font-normal`, `font-medium`, `font-semibold`, `font-bold` 클래스를 사용한다. 공통 설정이 Tmoney Regular / ExtraBold 자산에 연결한다.
- 공통 기준은 웹 globals.css의 기본값인 `1rem = 15`이다. 실제 값의 원본은 `src/theme/tokens.json`이며 CSS·Tailwind·Provider는 원본을 참조한다. Metro는 `inlineRem: false`로 설정하고 AppThemeProvider가 사용자의 크기 선택에 따라 runtime rem을 14 / 15 / 16으로 적용한다.
- 폰트는 `text-sm`, `text-base`, `text-lg`, `text-xl` 등 표준 크기와 원본의 `leading-*`를 사용한다. 간격·패딩·너비·높이·모서리도 `gap-4`, `p-2`, `h-12`, `rounded-lg`처럼 웹의 표준 클래스를 따른다.
- px 임의값은 웹에도 명시된 디자인 값(48px 워드마크, 3px 차트 모서리, 16px rounded-theme 등)에만 사용한다. 기존 모바일 클래스를 먼저 분석하고 문구·배치·기능을 임의 변경하지 않는다.

- 아이콘이나 EmotionImage처럼 크기 prop이 필요한 요소도 `useAppTheme()`의 `rem` 값을 기준으로 계산한다. rem 기준을 화면마다 다시 하드코딩하지 않는다.

## 피커 UI 기준

- 모든 앱 내부 피커는 `PickerModal`을 사용한다. 백업 선택 및 일기·습관 수정/삭제 메뉴의 카드 디자인을 기준으로 한다.
- 설명이 있는 메뉴 항목은 `PickerAction`, 연도·월·감정 같은 선택 항목은 `PickerOption`을 사용한다. surface 배경, `rounded-2xl`, 눌림·비활성 상태를 공통 컴포넌트에서 관리한다.
- 선택 상태는 accent 테두리와 강조 텍스트로 표시한다. 선택 텍스트에는 `text-theme-accent`를 적용한다. 다중 열 그리드는 `compact` 옵션으로 패딩을 줄인다.
- 메뉴 카드 사이 간격은 `gap-3`을 기본으로 한다. 월·감정처럼 열이 많은 그리드는 `gap-1.5`를 사용한다. 적용/완료 버튼은 공통 `Button`을 사용한다.
- safe area, 하단 패딩, 등장/닫힘 애니메이션은 `BottomSheetModal`에서 관리하며 새 피커에 개별 구현하지 않는다.
