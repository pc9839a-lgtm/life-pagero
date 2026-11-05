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

2026-11-05 발급받은 쿠팡 파트너스 다이나믹 배너(배너 ID `1046806`, 트래킹 코드 `AF2358798`)를 `scripts/inject-coupang-ad.mjs`에 등록했습니다. PC에서는 **680×180**, 700px 이하 모바일에서는 **320×250**을 출력합니다. 더 작은 기기에서는 공급자가 지원하는 `width: '100%'` 값을 사용합니다.

빌드 시 메인 2곳·카테고리 2곳·정식 게시글 2곳·이어읽기/기타 페이지 1곳에 광고를 삽입합니다. `g.js`는 각 문서에서 한 번만 불러오고, 각 위치에 배너 생성자를 한 번 실행합니다. 기존 텐핑·AdSense 코드는 변경하지 않습니다. 광고에는 제휴 수수료 공개 문구가 함께 나타납니다.

참고: 사이드바 전용 300×250 배너는 아직 발급받지 않았으므로 임의로 만들지 않았습니다. 여러 동일 배너 ID를 같은 페이지에서 생성할 때 광고 위치가 잘못 지정되지 않는지 실제 모바일·PC에서 별도 QA가 필요합니다.

## 콘텐츠 추가

`content/posts/<category>/<slug>.json` 파일을 추가합니다. `automation/article-template.json`과 `automation/CONTENT_RULES.md`를 따르고, 발행 전에 전체 빌드를 통과해야 합니다.

첫 URL에는 세 부분의 전체 본문이 모두 표시되고 검색 노출됩니다. `/2/`, `/3/`은 읽기 편의를 위한 `noindex,follow` 보조 페이지이며 각각 self-canonical을 사용합니다.

## 자동 발행

`automation/topic-queue.json`의 다음 주제를 최신 공식 출처로 검증해 새 JSON 글과 발행 로그를 같은 커밋에 반영합니다. GitHub 커밋 후 Cloudflare Pages가 자동 재배포합니다.
