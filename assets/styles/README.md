# 생활비서 CSS 관리

운영 화면의 공통 디자인 원본은 `assets/styles/editorial/`에 있습니다.
**`dist/life-editorial-20261106.css`는 빌드 결과물이므로 직접 수정하지 않습니다.**

| 원본 | 담당 화면/스타일 |
| --- | --- |
| `00-foundation.css` | Pretendard, 공통 토큰, 헤더·내비게이션·기본 레이아웃 |
| `10-home.css` | 생활비서 메인, 홈 서비스·뉴스·광고 배치 |
| `20-category.css` | 카테고리 기사 목록 |
| `30-article.css` | 기사 상세 기본 레이아웃 |
| `40-finance.css` | 금융 메뉴, 금리 비교, 반응형 금융 폼 |
| `50-today.css` | 공통 오늘 정보 위젯 |
| `60-responsive.css` | 공통 메뉴/메인/상세 반응형 조정 |
| `70-calculators.css` | 자동차·대출·예적금 계산기 |
| `80-food-guides.css` | 먹거리 상세 가이드 및 제휴 상품 |
 
## 빌드
`npm run build` 과정에서 `scripts/build-editorial-css.mjs`가 위 원본 9개를 **그 순서 그대로 연결**해 브라우저용 CSS 하나를 생성합니다. 선택자, 선언 순서와 미디어쿼리의 순서를 임의로 변경하지 마세요. 각 파일은 최상위 CSS 블록 단위로 구분되어 있습니다.

페이지 특화 자산 `public/today-wide.css`, `public/finance-experience.css`, `public/events-ui.css`, `public/real-estate.css`, `public/adpick-deals.css`, `public/life-food.css`는 현재 사용합니다. 공통 폰트·테두리·크기는 `00-foundation.css`의 토큰을 사용하고, 페이지에서 중복 선언하지 않는 것이 원칙입니다.

`public/styles.css`, `public/portal-ux.css`, `public/life-editorial-20261022.css`는 기존 화면의 기초 레이아웃/콘텐츠를 유지하는 레이어이므로 아직 삭제하면 안 됩니다. `life-modern.css`, `life-compact.css`, `life-global-nav.css`, `today-dashboard.css`는 중간 빌드 단계에서만 참조하며 최종 HTML에서 제거됩니다. 최종 빌드의 `scripts/finish-css-assets.mjs`가 해당 구버전 배포 자산을 제거합니다.

**주의:** CSS 분리 자체는 UI 변경이 아닙니다. 새 기능을 추가할 때는 공통 토큰을 우선 사용하고, CSS 파일을 추가해 마지막에 덮어씌우는 식의 임시 수정을 피합니다.
