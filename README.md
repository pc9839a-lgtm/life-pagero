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

- 자동 발견: npm run radar (금융위원회·KOSIS 공식 RSS 확인)
- 검사: npm run radar:test
- 예약: GitHub Actions의 LIFE Daily Topic Radar (한국시간 매일 07:15)
- 결과: GitHub Issues의 단일 주제 레이더 이슈 및 Actions artifact
- 기존 글과 주제가 겹치면 신규 URL이 아닌 보강 대상으로 표시
- source fail·재확인 지연 등은 경고. 자동 발행하지 않음

개발 순서와 SEO 품질 통제는 automation/GROWTH_SYSTEM_2026_KO.md를 참고하세요.
현재 운영 코드상 공개 카테고리는 여전히 car·support 2개이며 나머지 18개 분야는 확장 후보 분류입니다.
