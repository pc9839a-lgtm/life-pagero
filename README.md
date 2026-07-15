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

## 콘텐츠 추가

`content/posts/<category>/<slug>.json` 파일을 추가합니다. `automation/article-template.json`과 `automation/CONTENT_RULES.md`를 따르고, 발행 전에 전체 빌드를 통과해야 합니다.

첫 URL에는 세 부분의 전체 본문이 모두 표시되고 검색 노출됩니다. `/2/`, `/3/`은 읽기 편의를 위한 `noindex,follow` 보조 페이지이며 각각 self-canonical을 사용합니다.

## 자동 발행

`automation/topic-queue.json`의 다음 주제를 최신 공식 출처로 검증해 새 JSON 글과 발행 로그를 같은 커밋에 반영합니다. GitHub 커밋 후 Cloudflare Pages가 자동 재배포합니다.
