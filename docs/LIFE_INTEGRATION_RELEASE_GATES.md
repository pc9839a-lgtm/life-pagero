# LIFE 통합 패치 검수 기준

대상: GitHub `pc9839a-lgtm/life-pagero` → Cloudflare Pages 배포 → Pagero 프록시 `https://pagero.kr/life/`.

**패치를 GitHub에 병합했다는 이유만으로 운영 반영·기능 정상·SEO 성과를 선언하지 않는다.**

## 변경 전
1. `https://pagero.kr/life/deployment.json`의 `commit`을 확인하여 현재 실제 서비스 중인 코드를 명시한다.
2. `/life/sitemap.xml`, `/life/rss.xml`, `/life/search-index.json`, 원본 `/_headers`, 루트 `/robots.txt` 및 기존 기능 변경 범위를 확인한다.
3. Pagero `pc9839a-lgtm/inlet/functions/life/[[path]].js`의 HTML/JSON/CSS URL 재작성 규칙을 확인한다. JSON 검색 주소가 이미 `/life/`를 포함할 수 있다.

## 변경 후 PR 통과 기준
- `npm run check` 및 `npm run build` 통과. 기존 콘텐츠 48개, 먹거리 14개, 검색 결과 75개, 사이트맵 79개 등 실제 빌드 수치는 동적으로 검증한다.
- `LIFE SEO build and live indexability` workflow의 Chrome 브라우저 검사 통과: **360px/390px 모바일, 1280px PC**, 홈·검색·교통행정 글·먹거리·금융 계산기. 정식 URL, 헤더/스타일 로딩, 가로 화면 넘침, 검색 결과 클릭, 계산기 입력→결과 변경, 목차 세부 위치, JS 에러, 정적 파일 404를 확인한다.
- 브라우저는 **현재 PR이 새로 생성한 `dist`**를 로드하고 Pagero 메인 프록시의 경로 재작성 규칙을 재현한다. 단순 소스 문자열 검사보다 우선한다.
- 검색 화면에서 실제 검색어 입력·전송·결과 이동을 확인하고, 대출상환·주택담보대출·적금·자동차 유지비 계산기의 **입력값 변경 후 결과 갱신**을 검증한다. 홈 메뉴도 실제 링크 클릭으로 확인한다.
- 배포 SHA 확인용 `/deployment.json`은 Cloudflare Pages 원본과 Pagero 프록시 모두에서 `Cache-Control: no-store`여야 한다. 캐시된 과거 커밋을 최신 배포 상태로 오판하지 않는다.
- 실패하면 로그의 실제 원인을 분류한다: 기능 버그, 빌드 회귀, 외부 네트워크 실패, 테스트의 잘못된 대기/전제. 테스트 실패를 제거하기 위해 사용자 기능 검사를 생략하지 않는다.
- 브라우저 스크린샷과 JSON 증빙은 Actions `life-mobile-desktop-browser-qa` artifact에서 확인한다.
- 광고, 기존 고객 유입 링크, 계산기 수식, 가격 등 변경 범위 밖의 코드는 건드리지 않는다.

## 운영 배포 확인 기준
- 병합 직후의 GitHub Actions 빌드 통과는 배포 완료 증거가 아니다.
- Cloudflare 프로덕션이 갱신되었는지 `/life/deployment.json` SHA와 병합 SHA를 **직접 비교**한다.
- `npm run seo:audit:live`의 프록시·canonical·robots·검색 JSON·사이트맵·legacy 301·프리뷰 noindex를 확인한다.
- **main 병합 직후 GitHub Actions `postdeploy-browser`** 작업이 같은 SHA가 실제 배포될 때까지 최대 8분간 확인하고, 실제 `pagero.kr/life/` 페이지에서 모바일 360·390px/PC 1280px, 검색 클릭, 적금 입력, 가이드 목차, 실제 콘텐츠·사이트맵·RSS·noindex·404 등을 점검한다. 성공 조건은 체크아웃 SHA=Cloudflare `deployment.json` SHA의 정확한 일치이며, 만료·기능 오류는 별도 실패로 기록한다.
- 산출물은 `life-production-postdeploy-browser` artifact의 `life-production-browser-audit.json` 및 스크린샷·전체 SEO HTTP 감사에 남긴다. PR 통합 테스트는 생성물 검증이고, 병합 뒤 운영 브라우저 점검은 별개의 배포 검증이다.
- 최신 커밋의 운영 배포를 확인하지 못했으면 *미확인*으로 기록하고 다음 패치에서 누락 없이 재확인한다.
- 사이트맵이 유효하더라도 Google 실제 색인/노출/클릭 및 AdSense 승인은 증명되지 않는다. 해당 지표는 Search Console 및 광고 승인 결과를 별도 조회해야 한다.

## 배포 이상 발견 시
변경한 PR과 문제가 발생한 운영 URL/재현 단계/콘솔 오류/실제 배포 SHA를 함께 기록하고, 기존 기능을 임의로 제거하거나 전체 CSS 덮어쓰기로 처리하지 않는다. PR에서 재현 테스트를 추가해 원인을 수정하고 다시 전체 검증한다.
