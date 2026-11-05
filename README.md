# 생활비서 (`life.pagero.kr`)

자동차 생활행정과 정부지원·생활정책을 공식 출처 기반으로 정리하는 의존성 없는 정적 블로그입니다.

## 로컬 검수와 빌드

```bash
npm run check
npm run build
npm run validate:external
```

완성 파일은 `dist/`에 생성됩니다. 별도의 `npm install`은 필요하지 않습니다.

## Cloudflare Pages

- Framework preset: `None`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 20 이상
- 환경 변수: `.env.example` 참고

## AdSense

AdSense 소유권 확인과 실제 광고 노출을 분리합니다.

- `PUBLIC_ADSENSE_VERIFY_ENABLED=true`: 게시자 메타와 검토용 스크립트 유지
- `PUBLIC_ADSENSE_ADS_ENABLED=false`: 광고 슬롯은 렌더링하지 않음
- 승인 후 실제 광고를 표시하려면 `PUBLIC_ADSENSE_ADS_ENABLED=true`와 슬롯 ID를 함께 설정
- `ads.txt`는 유효한 `PUBLIC_ADSENSE_CLIENT`에서 자동 생성

## 쿠팡 파트너스 공통 배너

쿠팡 파트너스 다이나믹 배너(배너 ID `1046806`, 추적 코드 `AF2358798`, 템플릿 `carousel`)를 전체 사이트에 공통으로 삽입합니다.

- PC 본문: 가로 폭 100%, 높이 300px. 1100px 이상의 화면에서 전체 페이지 최대 폭을 1320px까지 확장해 가독성과 배너 시인성을 높입니다.
- PC 오른쪽 사이드바: 300×500px 세로형 1개. 메인·카테고리·게시글의 사이드바 상단에 배치합니다.
- 모바일(700px 이하): 본문 폭에 맞춰 최대 320px, 높이 250px. 화면에 겹치지 않도록 사이드바 광고는 900px 이하에서 숨깁니다.
- 메인/카테고리/정식 게시글: 본문 광고 2개 + PC 사이드 광고 1개. 이어읽기 등은 콘텐츠 길이를 고려해 본문 광고 1개를 적용합니다.
- 외부 `g.js`는 HTML 문서당 한 번만 로드하고, 각 광고 위치별로 위젯을 생성합니다. 기존 텐핑 광고/AdSense 설정과 본문 콘텐츠는 유지합니다.

사이드바 크기는 사용자로부터 전달받은 **동일한 배너 ID/추적 코드**를 사용해 크기만 조정한 것입니다. 실제 쿠팡 위젯 표시와 클릭 가능 여부는 배포 후 PC/모바일에서 별도 실화면 QA가 필요합니다.

## 콘텐츠 추가

`content/posts/<category>/<slug>.json` 파일을 추가합니다. `automation/article-template.json`과 `automation/CONTENT_RULES.md`를 따르고, 발행 전에 전체 빌드를 통과해야 합니다.

첫 URL에는 세 부분의 전체 본문이 모두 표시되고 검색 노출됩니다. `/2/`, `/3/`은 읽기 편의를 위한 `noindex,follow` 보조 페이지이며 각각 self-canonical을 사용합니다.

## 자동 발행

`automation/topic-queue.json`의 다음 주제를 최신 공식 출처로 검증해 새 JSON 글과 발행 로그를 같은 커밋에 반영합니다. GitHub 커밋 후 Cloudflare Pages가 자동 재배포합니다.

## 자연유입 확장 및 매일 주제 발굴

20개 생활경제·행정 주제군을 automation/growth-taxonomy.json에서 관리합니다.

- 자동 발견: npm run radar (금융위원회·행정안전부·고용노동부·서울시 공식 RSS 수집 및 KOSIS 통계 참고)
- 검사: npm run radar:test
- 예약: GitHub Actions의 LIFE Daily Topic Radar (한국시간 매일 07:15)
- 결과: GitHub Issues의 단일 주제 레이더 이슈 및 Actions artifact
- 기존 글과 주제가 겹치면 신규 URL이 아닌 보강 대상으로 표시
- source fail·재확인 지연 등은 경고. 자동 발행하지 않음

개발 순서와 SEO 품질 통제는 automation/GROWTH_SYSTEM_2026_KO.md를 참고하세요.
현재 운영 코드상 공개 카테고리는 여전히 car·support 2개이며 나머지 18개 분야는 확장 후보 분류입니다.

## ADPICK for BIZ 제휴 추천상품

- 공개 기능: `/deals/` 방문 시 ADPICK for BIZ 추천상품 `/best` 조회, 검색 시 `/search` 요청.
- 비공개 서버 기능: Cloudflare Pages Function `/deals/api`에서만 API 키를 사용합니다.
- 설정: Cloudflare Pages 런타임 Secret `ADPICK_BIZ_API_KEY`에 API KEY 관리 페이지에서 발급받은 키를 등록합니다. 프런트엔드에 키를 쓰지 않습니다.
- API: `https://biz.adpick.co.kr/api/{apikey}/best?area=today&limit=10`, `/search?q=...&limit=10`.
- 한도: best/search 각각 API 키 기준 분당 10회. 키 미설정·한도초과·응답 실패 시 상품을 숨깁니다.
- 사업자 공지에 따라 **상품 이미지·정보 DB 저장, 별도 캐시, 할인율 계산, 가격 이력 구축을 하지 않습니다.** 응답은 `Cache-Control: no-store`이며, 판매처 제공 가격·이미지·원래 커미션 링크만 일시 표시합니다.
- **핫딜이 아님:** API는 할인 전 가격을 보장하지 않아 일반 추천상품으로 표시합니다. 실제 핫딜/가격 알림 기능을 운영하려면 공급자와 별도 데이터 이용 권한을 협의해야 합니다.
- 제휴 관계 표시 및 `rel=sponsored` 적용. 제휴 전용 페이지는 SEO 위험을 줄이기 위해 `noindex,follow`; sitemap에는 넣지 않습니다.
- 기존 텐핑, 쿠팡, AdSense, 뉴스, 기존 콘텐츠는 수정하지 않습니다.
- 실제 운영은 키 발급, 실제 API 테스트 및 부하/노출 검증 후 별도로 배포합니다.
- 공식 문서: https://biz.adpick.co.kr/?ac=api&sub=guide

## 제철음식·먹거리 메뉴

- 상단 메뉴의 `먹거리`는 `/food/`로 연결되고, 기존 `핫딜`(`/deals/`) 및 다른 메뉴는 유지합니다.
- `scripts/add-food-hub.mjs`는 11월 제철 식재료와 조리·보관 예시, 12개월 선택기와 집밥 메뉴 추천을 만듭니다. 콘텐츠는 지역과 어획·수확 시기에 따라 달라지는 대표 예시입니다.
- 상품 검색은 기존 ADPICK for BIZ `/deals/?q=검색어`로 연결합니다. 음식 페이지에서는 제휴 API 호출이나 상품정보 저장을 하지 않으며 실제 조회·제휴 고지는 기존 딜 페이지에서 수행됩니다.
- `scripts/verify-food-hub.mjs`가 SEO, 상단 6개 메뉴, 월별 데이터, 제휴 링크를 검증합니다.

## 전국 축제·행사·공연 (/events/)

- 새로운 공개 목록/상세는 `scripts/build-events.mjs`에서 기존 `dist` 빌드 결과를 보존하며 추가합니다.
- 기본 필터는 **전국 / 전체 유형 / 무료+유료 모두 / 이번 주(월~일, KST)**입니다.
- `content/events.json`은 확인된 공공데이터의 정적 스냅샷입니다. 방문자마다 외부 API를 호출하거나 D1에 기록하지 않습니다.
- 무료 공급원: 한국관광공사 TourAPI, KOPIS, 서울시 문화행사 정보. 사진/포스터는 재사용 권한을 확인하기 전까지 **표시하지 않습니다**.
- GitHub Actions `Life weekly events sync`는 매일 09:15 KST (UTC 00:15) 자동 갱신을 시도합니다. 저장소 Actions Secrets에 `TOUR_API_KEY`, `KOPIS_API_KEY`, `SEOUL_EVENT_API_KEY`를 등록해야 해당 소스가 수집됩니다. 무료 데이터라도 API 인증키 발급은 별도로 필요합니다.
- 공개 시 행사별 고유 URL, OG 메타, KST 날짜 겹침 필터, 지역·종류·요금 필터, 모바일 기본 공유/링크 복사를 제공합니다.
- 브라우저에서 네이티브 공유를 사용하므로 Android 공유 메뉴에서 카카오톡으로 전달할 수 있습니다. 카카오 직접 공유 SDK는 앱 키와 도메인 등록 후 추가합니다.
- 사용자에게 조회 수·가짜 인기 순위·가짜 행사 데이터를 표시하지 않습니다. API 키가 없다면 페이지는 빈 상태를 정직하게 안내하고 `noindex` 처리합니다.
- **중요:** 이 저장소의 공개 정식 주소는 `https://pagero.kr/life/`이고 `life.pagero.kr`은 현재 Functions 코드상 301 리다이렉트됩니다. 페이지로 메인 프록시의 `/life/events/` 라우팅/반영은 운영에서 별도 검증해야 합니다.
- 테스트: `node --test scripts/events.test.mjs`, `npm run build`. 실제 API 응답 및 카카오톡 미리보기는 Secrets 등록과 배포 후 검수해야 합니다.
