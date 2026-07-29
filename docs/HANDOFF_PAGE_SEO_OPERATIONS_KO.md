# 생활비서(life.pagero.kr) 페이지·SEO·운영 인수인계서

- 운영 사이트: `https://life.pagero.kr`
- 저장소: `pc9839a-lgtm/life-pagero`
- 배포: `main` → Cloudflare Pages `life-pagero`
- 기준일: 2026-07-29

## 1. 절대 기준

1. 이 사이트는 자동차 생활행정과 정부·공공기관 지원정책을 다루는 독립 정보 사이트다.
2. `pc9839a-lgtm/inlet`과 `pagero.kr` 메인은 수정하지 않는다.
3. 상업 보험 상품, 정부기관 사칭, 승인·지급 보장 표현은 금지한다.
4. 정책 수치·기간·대상은 현재 공식 출처와 확인일을 기준으로 작성한다.

## 2. 글 한 개의 URL 구조

```text
검색 진입·첫 내용
/category/slug/

이어 읽기
/category/slug/2/
/category/slug/3/
```

### 첫 URL

- 첫 번째 `series.parts`의 제목·요약·이미지·본문만 표시
- 두 번째와 세 번째 부분의 본문을 중복 표시하지 않음
- 본문 아래 주요 CTA는 `/2/`로 연결
- `index,follow`
- self-canonical
- 사이트맵 포함
- Article, Breadcrumb, FAQ 구조화 데이터 사용
- 첫 페이지 하나만 읽어도 대상·신청기간 등 첫 번째 질문의 답을 얻을 수 있어야 함

### `/2/`, `/3/`

- 각 URL은 해당 `series.parts` 하나만 표시
- `/2/`의 주요 CTA는 `/3/`로 연결
- `/3/`의 주요 CTA는 공식 신청·조회 사이트로 연결
- `noindex,follow`
- 각 페이지 self-canonical
- 사이트맵 제외
- Article·FAQ·Breadcrumb 구조화 데이터 제거
- `1단계`, `2/3`, 진행률 UI는 표시하지 않음

## 3. CTA와 출처

- 첫 URL과 `/2/`의 주요 CTA는 내부 다음 페이지
- 공식기관 외부 CTA는 `/3/`에 표시
- 첫 URL에는 공식 출처 기관명·확인일·원문 링크를 표시한다
- `/2/`에는 출처 기관명과 확인일만 표시하고 외부 링크는 노출하지 않는다
- `/3/`에는 공식 출처 원문 링크와 공식 신청·조회 CTA를 표시한다
- 광고는 다음 내용 버튼과 공식 CTA 바로 위·아래에 배치하지 않는다
- 모든 source URL과 official CTA는 HTTPS여야 한다

## 4. 콘텐츠 기준

- 정확히 3개의 `series.parts`
- 각 부분 본문 1,000자 이상
- 전체 3,000자 이상
- 세 부분은 서로 다른 질문을 해결하고 같은 내용을 반복하지 않음
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
- 첫 URL에 두 번째·세 번째 본문이 중복 노출되는 문제
- 첫 URL에서 `/2/` 다음 내용 링크가 빠지는 문제
- `/2/`, `/3/`에 다른 부분의 본문이 섞이는 문제
- 후속 페이지 사이트맵 유출
- 진행 단계 UI 노출
- 편집 원칙 페이지·링크 재생성
- 내부 404
- 외부 공식 링크·이미지 404/410

## 7. 주요 스크립트

- `apply-content-updates.mjs`: 허용된 경로의 콘텐츠 번들만 적용
- `validate-content.mjs`: 콘텐츠·공식 호스트 검증
- `build.mjs`: 기본 정적 사이트 생성
- `build-series.mjs`: 1편·2편·3편을 각 URL에 중복 없이 생성
- `polish-listings.mjs`: 목록 대표 이미지 적용
- `seo-finalize.mjs`: 최종 메타·사이트맵 정리
- `validate-build-output.mjs`: 페이지별 콘텐츠 분리와 최종 산출물 검증
- `validate-external-resources.mjs`: 공식 링크·외부 이미지 상태 검사

## 8. 배포 완료 기준

- GitHub Actions `Validate site build` 성공
- Cloudflare Pages 배포 성공
- 첫 URL에는 첫 번째 부분만 표시
- `/2/`, `/3/`에는 각 부분만 표시
- 첫 URL → `/2/` → `/3/` 이동 정상
- `sitemap.xml`에는 첫 URL만 포함
- 운영 소스에서 robots와 canonical이 각 1개
