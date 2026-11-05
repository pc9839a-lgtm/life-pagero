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

Cloudflare Pages의 빌드 환경 변수 `PUBLIC_COUPANG_BANNER_HTML`에 쿠팡 파트너스에서 발급한 배너 HTML/JavaScript 전체를 입력합니다. 비어 있으면 광고를 생성하지 않습니다.

빌드 시 `scripts/inject-coupang-ad.mjs`가 메인 2곳·카테고리 2곳·정식 게시글 2곳 등 콘텐츠 화면의 여러 위치에 공통 배너를 넣고, 기타 HTML 페이지에는 기본 1곳을 적용합니다. 기존 텐핑·AdSense 설정은 변경하지 않습니다. 공식 다이나믹 배너의 고정 숫자 너비가 입력된 경우 `100%`로 조정해 컨테이너 폭에 맞춥니다. 권장 발급 크기는 680×180이며, 모바일 실화면에서 상품 잘림과 광고 문구를 검수한 뒤 활성화하세요. PC 사이드바 전용 300×250 배너는 별도 발급 코드를 받으면 추가할 수 있습니다.

## 콘텐츠 추가

`content/posts/<category>/<slug>.json` 파일을 추가합니다. `automation/article-template.json`과 `automation/CONTENT_RULES.md`를 따르고, 발행 전에 전체 빌드를 통과해야 합니다.

첫 URL에는 세 부분의 전체 본문이 모두 표시되고 검색 노출됩니다. `/2/`, `/3/`은 읽기 편의를 위한 `noindex,follow` 보조 페이지이며 각각 self-canonical을 사용합니다.

## 자동 발행

`automation/topic-queue.json`의 다음 주제를 최신 공식 출처로 검증해 새 JSON 글과 발행 로그를 같은 커밋에 반영합니다. GitHub 커밋 후 Cloudflare Pages가 자동 재배포합니다.
