# 생활비서(life.pagero.kr) 페이지·SEO·운영 인수인계서

- 운영 사이트: `https://life.pagero.kr`
- 저장소: `pc9839a-lgtm/life-pagero`
- 배포: `main` → Cloudflare Pages `life-pagero`
- 기준일: 2026-07-15

## 1. 절대 기준

1. 이 사이트는 자동차 생활행정과 정부·공공기관 지원정책을 다루는 독립 정보 사이트다.
2. `pc9839a-lgtm/inlet`과 `pagero.kr` 메인은 수정하지 않는다.
3. 상업 보험 상품, 정부기관 사칭, 승인·지급 보장 표현은 금지한다.
4. 정책 수치·기간·대상은 현재 공식 출처와 확인일을 기준으로 작성한다.

## 2. 글 한 개의 URL 구조

```text
검색·완성 글
/category/slug/

읽기 편의용 보조 페이지
/category/slug/2/
/category/slug/3/
```

### 첫 URL

- 세 개 `series.parts`의 제목·요약·이미지·전체 본문을 모두 화면에 표시
- `index,follow`
- self-canonical
- 사이트맵 포함
- Article, Breadcrumb, FAQ 구조화 데이터 사용
- 검색 사용자가 첫 URL 하나만 읽어도 전체 답을 얻을 수 있어야 함

### `/2/`, `/3/`

- 해당 부분만 읽기 좋게 표시
- `noindex,follow`
- 각 페이지 self-canonical
- 사이트맵 제외
- Article·FAQ·Breadcrumb 구조화 데이터 제거
- `1단계`, `2/3`, 진행률 UI는 표시하지 않음

## 3. CTA와 출처

- 첫 URL과 `/2/`의 주요 CTA는 내부 다음 페이지
- 공식기관 외부 CTA는 `/3/`에 표시
- 첫 URL에는 공식 출처 기관명·확인일·원문 링크를 표시한다
- 출처 링크는 근거 확인용이며, 공식 신청·조회 CTA는 `/3/`보다 앞당기지 않는다
- 모든 source URL과 official CTA는 HTTPS여야 한다

## 4. 콘텐츠 기준

- 정확히 3개의 `series.parts`
- 각 부분 본문 1,000자 이상
- 전체 3,000자 이상
- 각 부분별 이미지와 10자 이상의 alt
- 각 부분 핵심 포인트 3개 이상
- FAQ 2개 이상
- 제목·slug 중복 금지

## 5. AdSense

환경변수 역할을 구분한다.

```text
PUBLIC_ADSENSE_CLIENT
PUBLIC_ADSENSE_VERIFY_ENABLED
PUBLIC_ADSENSE_ADS_ENABLED
PUBLIC_AD_SLOT_TOP
PUBLIC_AD_SLOT_MID
PUBLIC_AD_SLOT_BOTTOM
```

- 검토 중에는 `VERIFY_ENABLED=true`
- 광고 슬롯은 `ADS_ENABLED=true`일 때만 생성
- 슬롯 ID가 없으면 광고 본문 블록은 생성되지 않음
- `ads.txt`는 게시자 ID에서 자동 생성

## 6. 필수 검증

```bash
npm run check
npm run build
npm run validate:external
```

빌드는 다음 오류를 차단한다.

- 콘텐츠 번들의 저장소 외부 경로 쓰기
- 중복 robots/canonical
- 첫 URL의 전체 3개 부분 누락
- 후속 페이지 사이트맵 유출
- 진행 단계 UI 노출
- 편집 원칙 페이지·링크 재생성
- 내부 404
- 외부 공식 링크·이미지 404/410

## 7. 주요 스크립트

- `apply-content-updates.mjs`: 허용된 경로의 콘텐츠 번들만 적용
- `validate-content.mjs`: 콘텐츠·공식 호스트 검증
- `build.mjs`: 기본 정적 사이트 생성
- `build-series.mjs`: 완성 첫 URL과 보조 페이지 생성
- `polish-listings.mjs`: 목록 대표 이미지 적용
- `seo-finalize.mjs`: 최종 메타·사이트맵 정리
- `validate-build-output.mjs`: 최종 산출물 검증
- `validate-external-resources.mjs`: 공식 링크·외부 이미지 상태 검사

## 8. 배포 완료 기준

- GitHub Actions `Validate site build` 성공
- Cloudflare Pages 배포 성공
- 첫 URL 정상 접속
- `/2/`, `/3/` 정상 접속
- `sitemap.xml`에는 첫 URL만 포함
- 운영 소스에서 robots와 canonical이 각 1개
