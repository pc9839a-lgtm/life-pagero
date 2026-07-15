# 생활비서(life.pagero.kr) 페이지 구조·SEO·운영 인수인계서

- 작성일: 2026-07-15
- 운영 사이트: https://life.pagero.kr
- 저장소: `pc9839a-lgtm/life-pagero`
- 배포: GitHub `main` → Cloudflare Pages `life-pagero`
- 문서 목적: 다음 작업자가 사용자 의도를 다시 묻지 않고, 페이지·SEO·콘텐츠·배포 작업을 즉시 안전하게 이어갈 수 있도록 현재 구조와 금지사항을 고정한다.

---

## 1. 가장 먼저 읽을 핵심 요약

1. 이 사이트는 자동차 행정·비용과 정부지원 정책을 다루는 AdSense 수익형 정보 사이트다.
2. 글 한 개는 사용자가 자연스럽게 3개 URL을 순서대로 읽도록 구성한다.
3. 검색엔진에는 첫 페이지 한 개만 노출한다. `/2/`, `/3/`은 읽기용 보조 페이지다.
4. 첫 페이지는 `index,follow`, 자기 자신 canonical, 사이트맵 등록 대상이다.
5. `/2/`, `/3/`은 `noindex,follow`, canonical은 첫 페이지, 사이트맵에서 제외한다.
6. 사용자가 보는 화면에 `1단계`, `2단계`, `1/3`, 진행률 UI를 노출하면 안 된다.
7. 첫 두 페이지의 CTA는 내부 다음 페이지로만 연결하고, 공식기관 외부 링크는 마지막 페이지에서만 노출한다.
8. 각 페이지 본문은 최소 1,000자, 글 전체는 최소 3,000자이며 각 페이지에 관련 이미지와 alt가 있어야 한다.
9. 상업 보험 콘텐츠는 금지한다. 정책·지원 글은 현재 시행 중인 실제 사업명을 우선하고 공식 출처를 확인한다.
10. `pc9839a-lgtm/inlet` 및 `pagero.kr` 메인은 절대 수정하지 않는다. 현재 페이지로 메인 패치 작업과 충돌할 수 있다.

---

## 2. 프로젝트 목표와 사용자 의도

### 2.1 사이트 역할

`생활비서`는 자동차 검사·이전등록·세금·과태료 등 생활행정과 정부·공공기관의 지원 정책을 공식 출처 기준으로 설명하는 독립 정보 사이트다. 정부기관처럼 보이면 안 되며, 신청 결과를 보장하거나 민원을 대행하는 표현도 금지한다.

### 2.2 수익·체류 구조

하나의 검색 주제를 3개의 충분한 정보 페이지로 나눈다. 단순히 문장을 잘라 페이지 수만 늘리는 구조가 아니다. 각 페이지가 독립적으로 읽을 가치가 있어야 하고, 다음 페이지로 넘어가야 새로운 정보가 나와야 한다.

예시:

```text
검색 유입 URL
/car/car-inspection-period/

사용자 다음 이동
/car/car-inspection-period/2/

최종 확인 페이지
/car/car-inspection-period/3/
```

검색 순위와 신호는 첫 페이지에 집중시키고, `/2/`, `/3/`은 사용자 체류와 내용 전개를 위한 보조 페이지로 유지한다.

---

## 3. 저장소와 수정 범위

### 3.1 수정 가능한 저장소

```text
pc9839a-lgtm/life-pagero
```

기본 브랜치:

```text
main
```

Cloudflare Pages 프로젝트:

```text
life-pagero
```

### 3.2 절대 수정 금지

```text
pc9839a-lgtm/inlet
https://pagero.kr
```

`pagero.kr` 메인은 별도 프로젝트이며 현재 패치 작업 중이다. 애드센스 인증, `ads.txt`, `robots.txt`, 메타 태그 등을 이유로도 사용자 명시 승인 없이 수정하면 안 된다.

### 3.3 작업 전 확인

작업 요청이 `생활비서`, `life.pagero.kr`, 자동차·정책 콘텐츠, 3페이지 글 구조와 관련된 경우에만 `life-pagero` 저장소를 수정한다. 요청에 `pagero.kr 메인`, 페이지로 앱, 에디터가 포함되면 같은 저장소라고 추측하지 말고 수정 대상을 다시 구분한다.

---

## 4. 페이지 URL 및 SEO 규칙

### 4.1 첫 페이지

예시:

```text
https://life.pagero.kr/car/car-inspection-period/
```

필수 상태:

```html
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="https://life.pagero.kr/car/car-inspection-period/">
```

처리 원칙:

- Google·네이버 검색 노출 대상
- `sitemap.xml` 등록 대상
- `<lastmod>` 포함
- 고유 title·description
- 고유 `og:image` 및 `twitter:image`
- Article·FAQ·Breadcrumb 구조화 데이터 적용
- 검색 의도를 대표하는 핵심 제목 사용

### 4.2 두 번째·세 번째 페이지

예시:

```text
https://life.pagero.kr/car/car-inspection-period/2/
https://life.pagero.kr/car/car-inspection-period/3/
```

필수 상태:

```html
<meta name="robots" content="noindex,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="https://life.pagero.kr/car/car-inspection-period/">
```

처리 원칙:

- URL과 페이지는 정상적으로 열려야 한다.
- 사용자는 첫 페이지의 버튼을 통해 이동할 수 있어야 한다.
- 검색 결과에는 직접 노출시키지 않는다.
- 링크 크롤링은 허용하므로 `follow`를 유지한다.
- 사이트맵에는 넣지 않는다.
- 중복 Article·FAQ·Breadcrumb 구조화 데이터는 제거한다.

### 4.3 왜 이렇게 하는가

세 페이지 모두 같은 검색어를 노리면 자기 페이지끼리 순위를 나눠 갖는 키워드 카니발라이제이션이 발생할 수 있다. 첫 페이지 하나에 검색 신호를 몰고 보조 페이지는 `noindex,follow`로 유지해야 검색 유입과 3페이지 체류 구조를 동시에 살릴 수 있다.

---

## 5. 화면에서 반드시 지킬 규칙

### 5.1 진행 단계 표시 금지

다음 표현을 사용자 화면에 보여주지 않는다.

```text
1단계 / 2단계 / 3단계
1/3 / 2/3 / 3/3
진행 단계
다음 단계
하나의 콘텐츠를 단계별로 나누어 안내합니다
```

페이지가 나뉘었다는 사실을 사용자가 과도하게 인식하면 안 된다. 버튼 문구는 실제 다음 정보의 내용으로 쓴다.

좋은 예:

```text
공식 사이트 조회 순서 확인
과태료와 예약 준비 확인
신청 페이지에서 최종 확인
```

나쁜 예:

```text
2단계로 이동
다음 단계
3/3 확인
```

현재 `build-series.mjs`에는 과거 진행 UI 마크업이 남아 있을 수 있으므로 `polish-series.mjs`와 `series.css`의 숨김·정리 단계가 빌드에서 빠지면 안 된다. 향후 리팩터링할 때는 마크업 자체를 제거하는 방향이 더 안전하다.

### 5.2 CTA 규칙

첫 페이지:

```text
내부 다음 페이지 버튼만 노출
```

두 번째 페이지:

```text
이전 페이지 + 내부 다음 페이지 버튼
```

세 번째 페이지:

```text
이전 페이지 + 공식기관 외부 CTA
```

공식기관 링크를 첫 페이지에 먼저 노출하면 사용자가 3페이지를 읽지 않고 이탈하므로 금지한다. 다만 공식 출처 기관명과 확인일은 정보 신뢰성을 위해 표시할 수 있으며, 앞 페이지에서는 링크를 클릭 불가 텍스트로 보여주는 방식이 기본이다.

---

## 6. 콘텐츠 품질 기준

### 6.1 분량

- 페이지별 한국어 본문 최소 1,000자
- 글 전체 최소 3,000자
- 페이지별 핵심 포인트 최소 3개
- 동일 문장 반복과 억지 분량 늘리기 금지

### 6.2 페이지별 역할

첫 페이지는 검색 의도와 기본 조건을 명확히 해결한다. 두 번째 페이지는 실제 조회·신청·계산 순서처럼 실행 정보를 제공한다. 마지막 페이지는 주의사항, 예외, 준비물, 공식 확인 행동까지 마무리한다.

### 6.3 이미지

각 페이지마다 내용과 직접 관련된 이미지가 한 장 이상 있어야 한다.

필수 항목:

```text
image
imageAlt
```

SEO 메타에도 같은 대표 이미지를 연결한다.

```text
og:image
twitter:image
Article schema image
```

이미지는 단순 장식이 아니라 해당 페이지 내용을 설명해야 하며, alt에는 페이지 핵심 주제가 자연스럽게 들어가야 한다.

### 6.4 정책 콘텐츠

정책·지원 글은 다음 정보를 실제 공식 공고에서 확인한다.

- 사업명
- 신청 기간 또는 현재 접수 상태
- 지원 대상
- 지원 금액·한도
- 예산 소진 여부 또는 지역 차이
- 공식 출처
- 자료 확인일

종료된 사업을 현재 신청 가능한 것처럼 쓰면 안 된다. 정보가 바뀌면 `updatedAt`, `reviewedAt`, 출처 확인일과 본문 상태를 함께 갱신한다.

### 6.5 금지 주제·표현

- 상업 보험 상품·가입 유도 콘텐츠
- 정부기관을 사칭하거나 공식 사이트처럼 보이는 표현
- 승인·지원금 지급·민원 결과 보장
- 광고 클릭 유도 문구
- 공식 내용을 그대로 대량 복사
- 지역명·연도만 바꾼 대량 유사 페이지
- 내용이 거의 없는 분할 페이지

---

## 7. 현재 빌드 구조와 파일 역할

### 7.1 `package.json`

현재 빌드 순서의 핵심:

```text
apply-content-updates
→ validate:content
→ build.mjs
→ build-series.mjs
→ polish-series.mjs
→ polish-listings.mjs
→ remove-editorial-policy.mjs
→ seo-finalize.mjs
→ validate-build-output.mjs
```

순서를 임의로 바꾸지 않는다. 특히 `seo-finalize.mjs`는 시리즈 생성과 화면 정리가 끝난 뒤 실행되어야 하고, `validate-build-output.mjs`는 마지막에 실행되어야 한다.

### 7.2 주요 스크립트

| 파일 | 역할 |
|---|---|
| `scripts/apply-content-updates.mjs` | 자동화용 콘텐츠 번들을 실제 JSON에 적용 |
| `scripts/validate-content.mjs` | 3페이지, 분량, 이미지, 출처, CTA 등 콘텐츠 기준 검증 |
| `scripts/build.mjs` | 기본 정적 HTML, 메타, 카테고리, 사이트맵 등 생성 |
| `scripts/build-series.mjs` | 각 글의 `/2/`, `/3/` 시리즈 페이지 생성 |
| `scripts/polish-series.mjs` | 화면에서 진행 단계 표현 제거·이미지·본문 표현 정리 |
| `scripts/polish-listings.mjs` | 목록 카드에 실제 글 대표 이미지 반영 |
| `scripts/remove-editorial-policy.mjs` | 공개 화면에서 편집 원칙 페이지·링크 제거 |
| `scripts/seo-finalize.mjs` | 첫 페이지만 index, 보조 페이지 noindex·canonical 통합, 고유 이미지 메타, 사이트맵 재작성 |
| `scripts/validate-build-output.mjs` | SEO 규칙과 최종 배포 산출물을 검증하고 오류 시 빌드 중단 |

### 7.3 콘텐츠 위치

```text
content/posts/car/*.json
content/posts/support/*.json
```

각 콘텐츠 JSON에는 최소한 다음 필드가 필요하다.

```json
{
  "title": "...",
  "description": "...",
  "slug": "...",
  "category": "car 또는 support",
  "publishedAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "reviewedAt": "YYYY-MM-DD",
  "keywords": [],
  "sources": [],
  "faqs": [],
  "officialCta": {},
  "series": {
    "parts": [
      {"title":"...","description":"...","keyPoints":[],"body":"...","image":"...","imageAlt":"..."},
      {"title":"...","description":"...","keyPoints":[],"body":"...","image":"...","imageAlt":"..."},
      {"title":"...","description":"...","keyPoints":[],"body":"...","image":"...","imageAlt":"..."}
    ]
  }
}
```

---

## 8. 현재 대표 페이지 확인 기준

대상:

```text
https://life.pagero.kr/car/car-inspection-period/
https://life.pagero.kr/car/car-inspection-period/2/
https://life.pagero.kr/car/car-inspection-period/3/
```

### 8.1 첫 페이지에서 확인

- HTTP 200 및 정상 화면
- 제목: 자동차 검사기간 관련 대표 검색 제목
- `robots=index,follow`
- canonical이 자기 자신
- 다음 페이지 버튼이 `/2/`로 연결
- 진행 단계 숫자 표시 없음
- 대표 이미지 및 alt 정상
- 사이트맵에 첫 URL만 존재

### 8.2 두 번째 페이지에서 확인

- HTTP 200 및 정상 화면
- 실제 두 번째 내용이 표시
- `robots=noindex,follow`
- canonical이 첫 페이지
- 사이트맵에 `/2/` 없음
- 이전·다음 내부 링크 정상
- `2단계`, `2/3` 같은 진행 표시 없음
- 중복 Article·FAQ 구조화 데이터 없음

### 8.3 세 번째 페이지에서 확인

- HTTP 200 및 정상 화면
- `robots=noindex,follow`
- canonical이 첫 페이지
- 사이트맵에 `/3/` 없음
- 최종 공식기관 CTA 노출
- FAQ와 출처가 자연스럽게 마무리됨

---

## 9. “링크 정상?” 요청을 해석하는 방법

사용자가 특정 `/2/` URL을 주며 “링크 정상?”이라고 물어도 단순히 404 여부만 답하면 안 된다. 이 프로젝트에서는 보통 다음을 모두 묻는 의미다.

1. 페이지가 실제로 열리는가
2. 올바른 두 번째 내용이 표시되는가
3. 다음·이전 이동이 정상인가
4. SEO가 `noindex,follow`와 첫 페이지 canonical로 적용됐는가
5. 사이트맵에서 제외됐는가

실시간 운영 URL을 직접 확인하지 못했으면 “코드 구조상 정상”이라고 단정하지 않는다. 저장소 기준 확인과 운영 배포 확인을 분리해 말한다.

좋은 답변 예:

```text
운영 URL은 정상적으로 열리고, /2/에는 noindex,follow가 적용됐으며 canonical은 첫 페이지입니다. 사이트맵에도 /2/가 없습니다. 따라서 사용자 이동용 페이지로 정상입니다.
```

직접 확인 불가 시:

```text
저장소·빌드 규칙에는 정상 적용돼 있습니다. 다만 현재 환경에서 운영 응답을 직접 확인하지 못했으므로 Cloudflare 최신 배포와 view-source 확인이 필요합니다.
```

---

## 10. 배포 및 검증 절차

### 10.1 작업 후 필수 명령

```bash
npm run check
npm run build
```

두 명령 모두 통과해야 커밋한다. 빌드 실패를 우회하거나 검증 스크립트를 삭제하지 않는다.

### 10.2 Cloudflare 확인

- 저장소: `pc9839a-lgtm/life-pagero`
- 브랜치: `main`
- 프로젝트: `life-pagero`
- 최신 커밋과 배포 커밋 SHA 일치
- 배포 상태 `success`

### 10.3 운영 소스 확인

브라우저에서 다음 형식으로 확인한다.

```text
view-source:https://life.pagero.kr/car/car-inspection-period/
view-source:https://life.pagero.kr/car/car-inspection-period/2/
```

검색 항목:

```text
name="robots"
rel="canonical"
og:image
twitter:image
application/ld+json
```

사이트맵:

```text
https://life.pagero.kr/sitemap.xml
```

확인 기준:

- 첫 페이지만 포함
- `/2/`, `/3/` 미포함
- 각 URL에 `<lastmod>` 존재
- 중복 URL 없음

robots:

```text
https://life.pagero.kr/robots.txt
```

필수:

```text
User-agent: *
Allow: /
Sitemap: https://life.pagero.kr/sitemap.xml
```

---

## 11. AdSense 현재 상태와 주의사항

- 사용자는 이미 AdSense 승인 요청을 진행했다.
- 생활비서 빌드에는 게시자 번호 `ca-pub-1906196934401001`이 기본값으로 들어가 있다.
- 실제 광고 슬롯 ID가 없으면 광고 본문 슬롯은 표시되지 않는다.
- 등록 도메인 문제 때문에 `pagero.kr` 루트 확인이 필요할 수 있지만, 현재 `pagero.kr` 메인은 패치 중이므로 수정 금지다.
- 사용자가 명시적으로 허용하기 전까지 `inlet` 저장소, `pagero.kr` 메타 태그, `ads.txt`, `robots.txt`를 건드리지 않는다.
- AdSense 상태를 설명할 때 “승인 요청 전”이라고 말하지 않는다. 사용자는 이미 요청했다.

---

## 12. 자동 발행 시 지켜야 할 규칙

일일 자동 발행은 한 번에 글 1개를 발행한다.

필수 처리:

1. 최신 공식 정부·공공기관 자료 확인
2. 기존 제목·slug·키워드 중복 확인
3. 정확히 3개의 `series.parts` 작성
4. 각 페이지 본문 1,000자 이상
5. 페이지별 이미지·alt 삽입
6. 첫 두 페이지는 내부 다음 CTA
7. 마지막 페이지에만 공식 CTA
8. `topic-queue.json`, `published-log.json` 갱신
9. `npm run check`, `npm run build`
10. `main` 커밋 후 배포 확인

우선 주제:

- 자동차 등록·검사·세금·과태료·말소·번호판
- 현재 신청 가능한 정부·공공기관 지원 사업

금지:

- 보험 상품
- 검증되지 않은 지원금
- 이미 종료된 사업을 현재 정책처럼 발행
- 내용이 얇은 3페이지 분할

---

## 13. 다음 작업자용 즉시 실행 체크리스트

### 페이지 오류 수정 요청을 받은 경우

```text
[ ] 요청 URL과 저장소를 먼저 구분했다.
[ ] life-pagero만 수정하며 inlet은 건드리지 않았다.
[ ] 첫 페이지인지 /2/, /3/인지 확인했다.
[ ] 화면 오류와 SEO 오류를 모두 점검했다.
[ ] visible 단계 UI가 없는지 확인했다.
[ ] CTA가 올바른 다음 URL로 연결되는지 확인했다.
[ ] npm run check와 npm run build를 통과했다.
[ ] Cloudflare 최신 배포 SHA를 확인했다.
[ ] 운영 view-source까지 확인했다.
```

### SEO 수정 요청을 받은 경우

```text
[ ] 첫 페이지 index,follow
[ ] 첫 페이지 self canonical
[ ] /2/, /3/ noindex,follow
[ ] /2/, /3/ canonical → 첫 페이지
[ ] 사이트맵은 첫 페이지만
[ ] lastmod 존재
[ ] 게시글별 og:image와 twitter:image
[ ] Article image와 Breadcrumb schema
[ ] 검색 페이지 noindex
[ ] robots.txt 사이트맵 경로 정상
```

### 답변 전에 확인할 것

- 사용자가 묻는 것은 단순 페이지 접속인가, SEO 상태인가, 둘 다인가
- 운영에서 확인했는지, 저장소만 확인했는지 구분
- 실행하지 않은 작업을 완료했다고 말하지 않기
- 사용자가 이미 말한 상태를 다시 부정하지 않기

---

## 14. 현재 핵심 결론

`/car/car-inspection-period/2/` 같은 URL은 삭제하거나 리다이렉트할 대상이 아니다. 사용자가 다음 내용을 읽기 위한 정상 페이지다. 다만 검색엔진에는 직접 노출하지 않고 첫 페이지에 검색 신호를 집중한다.

정상 상태는 다음과 같다.

```text
첫 페이지: index,follow / self canonical / sitemap 포함
두 번째: noindex,follow / canonical 첫 페이지 / sitemap 제외
세 번째: noindex,follow / canonical 첫 페이지 / sitemap 제외
```

이 구조를 깨지 않고 콘텐츠 품질·정확성·이미지·내부 이동을 개선하는 것이 이후 모든 작업의 기준이다.
