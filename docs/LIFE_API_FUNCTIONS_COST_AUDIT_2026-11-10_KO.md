# 생활비서 API·Functions 비용 재점검 (2026-11-10)

## 점검 대상·범위
- 생활비서 저장소: `pc9839a-lgtm/life-pagero` (main, 2026-11-10)
- 공개 도메인 프록시: `pc9839a-lgtm/inlet/functions/life/[[path]].js` 및 `functions/_middleware.js`
- Cloudflare 실비용/요청 실측 통계는 연결되어 있지 않음. 아래는 **코드 경로와 GitHub Actions 검증에 따른 구조적 판단**이며 절감률 추정치가 아님.

## 실제 공개 경로
1. 브라우저: `https://pagero.kr/life/... `
2. 페이지로 메인 Cloudflare Pages: `inlet/functions/life/[[path]].js` 가 GET/HEAD를 `https://life-pagero.pages.dev/...`로 프록시.
3. 원본 생활비서 Cloudflare Pages: 빌드된 `dist/_routes.json`으로 CSS·JS·이미지·JSON 등 **원본 측** 정적 파일에 대한 Functions 실행을 제외.
4. 메인 프록시는 `/life/`의 CSS·JS·이미지를 포함한 모든 HTTP 요청을 여전히 함수로 처리하며, 현재 별도의 앱 내부 캐시가 없음. 따라서 원본에서 Functions 제외 = 공개 메인 프록시까지 무료 처리 **아님**.
5. 메인 프록시의 HTML은 최신 게시물과 SEO 반영을 위해 `no-store` 처리. HTML을 무작정 장기 캐시하면 새 글·최신 내용 노출 지연 위험.

## API별 현재 최적화 상태
| 데이터/호출 | 현재 정책 | 남은 위험 |
|---|---|---|
| 날씨 KMA | 1시간 per-PoP 캐시, 화면에 진입한 냉간 위젯만 호출 | 원본 캐시와 별도로 메인 /life 프록시 요청은 발생 |
| 뉴스 RSS | 2시간 per-PoP 캐시, 화면 밖 최초 호출 연기 | 복수 외부 피드 실패 때 캐시 미스 비용과 응답 지연 |
| 업비트 KRW | 1시간 캐시, 화면 밖 연기 | 실시간 거래용 데이터가 아님; 기준 시각 표시 필요 |
| ECB 참고환율 | 24시간 캐시, 오늘 화면 HTML에 검증 데이터 사전 표시 | 브라우저에서 오류 시 직접 공개 API 재조회 가능 |
| KRX 지수 | 6시간 캐시, 6시간 주기 브라우저 폴링 삭제 | 기본 화면과 별개인 사용 시 원본 데이터 fetch |
| 금융감독원 상품 | 6시간 캐시 + 24시간 stale + 장애 10분 재시도 제한, 탭 내부 조건별 결과 중복 조회 방지 | 원본은 1회 갱신에 다중 페이지(최대 8페이지) API 요청 |
| 공식 금융 이슈 | 30분 캐시 + 6시간 stale + 장애 10분 재시도 제한 | 1회 갱신에 최대 4개 RSS |
| 애드픽 제휴 | 공급사 데이터 저장·캐싱 금지, 상품 영역 노출 시 조회, 연속 탭·중복 요청 억제 | **실제 조회 시마다** 공개 프록시와 ADPICK API 호출 발생. 광고 노출 시점에서 공급사 실패 가능 |
| 행사 JSON | **이번 패치**: `/life/events-data.json` 경로 수정 + 브라우저 5분/CDN 15분 캐시 | 정적 JSON이라도 캐시 미적중 시 메인 프록시 요청은 발생 |
| 계산기·먹거리 장보기 | 브라우저 내 계산·로컬 저장소, 별도 서버 API 호출 없음 | 링크 경로가 canonical /life/로 맞는지 유지 검증 필요 |

## 기타 실제 문제와 이번 수정
- `public/events-ui.js`: 공개 도메인에서 원본 JS의 루트 절대 경로(`/events-data.json`, `/events/...`)가 `/life/`로 바뀌지 않았음. 앱 코드가 직접 호스트에 맞는 접두사를 계산하도록 수정.
- `public/life-food.js`: 장보기 목록·계절별 식품 카드의 **동적** 애드픽 링크가 `/deals/`로 생성돼 canonical `/life/deals/`를 벗어날 수 있음. 접두사 보완.
- `.github/workflows/verify-life-modern-public.yml`: 과거 디자인용 검사에서 2026-11-10 main 배포 후에도 20번 재시도하고 실패. 현재 디자인 자동 build/QA는 유지하고, 오래된 감사를 수동 실행으로 이동, 재시도 2회로 제한.

## 비용을 더 줄이기 위한 후속 작업 우선순위
1. **최우선: 메인 inlet 프록시 요청 건수 측정**. Cloudflare `inlet` 프로젝트의 Functions Requests / subrequests / CPU time을 분리해 확인. `life-pagero` 원본 프로젝트의 Functions Requests와 대조. 수치 없이 절감률·과금액을 확정하지 말 것.
2. **메인 프록시 구조 개선**. 정적 파일은 중간 Functions 없이 직접 서빙하도록 배포·경로 아키텍처를 재설계하거나, 공식 지원되는 앞단 Workers Cache 옵션을 검증. `caches.default`를 함수 **내부**에 추가하는 것만으로 메인 Functions 호출 건수는 줄지 않음. 인증·쿠키·SEO·현행 URL 보존 테스트 선행.
3. **API 미지원·503 상태 모니터링**. 캐시 미적중, 외부 공급자 타임아웃, 사용자 재조회 비율 측정. 공급사 라이선스 제약이 있는 애드픽 상품은 서버 보관/캐싱하지 말 것.
4. **정확한 회귀 검사**. `npm run check`, `npm run build`, `scripts/verify-events.mjs`, `scripts/verify-food-hub.mjs`, 배포 후 `/life/events/`, `/life/food/`의 링크 및 정적 JSON URL 확인.

## 확인 한계
- 사용자 Cloudflare Analytics/Billing 요청 통계는 연결되지 않았으므로 실제 절감률을 계산하지 않음.
- Cloudflare per-PoP Cache API 캐시는 원본 데이터센터 간 자동 전역 공유를 보장하지 않음.
- Github Actions 소스·빌드 통과와 사용자가 보는 공개 도메인 전체 경로에 대한 실브라우저 검증은 별개임.
