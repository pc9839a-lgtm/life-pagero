# 사용자가 직접 해야 하는 설정

## 1. GitHub 저장소 생성
1. GitHub에서 **New repository**를 누릅니다.
2. Repository name: `life-pagero`
3. README, .gitignore, 라이선스는 추가하지 않고 빈 저장소로 생성합니다.
4. 생성 후 ChatGPT에 `저장소 만들었음`이라고 알려주세요. 연결된 GitHub 계정의 `pc9839a-lgtm/life-pagero`에 현재 파일을 올릴 수 있습니다.

## 2. Cloudflare Pages 연결
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
2. GitHub 저장소 `life-pagero` 선택
3. Production branch: `main`
4. Framework preset: `None`
5. Build command: `npm run build`
6. Build output directory: `dist`
7. Node.js 버전은 20 이상 사용

## 3. 서브도메인 연결
1. 배포 완료 후 Pages 프로젝트 → Custom domains → Set up a custom domain
2. `life.pagero.kr` 입력
3. `pagero.kr`이 Cloudflare DNS에 있으면 필요한 DNS 레코드가 자동으로 연결됩니다.
4. 외부 DNS를 사용하더라도 먼저 Pages의 Custom domains에서 도메인을 연결한 뒤 안내된 CNAME을 설정합니다.

## 4. 실제 연락 이메일 확인
Cloudflare 환경변수 `PUBLIC_CONTACT_EMAIL`에 실제로 수신 가능한 이메일을 입력합니다. 기본값은 `info@pagero.kr`입니다.

## 5. 검색엔진 등록
1. Google Search Console에 `life.pagero.kr` 등록
2. `https://life.pagero.kr/sitemap.xml` 제출
3. 네이버 서치어드바이저에도 사이트와 사이트맵 등록

## 6. AdSense 신청
1. 사이트가 정상 배포된 후 `PUBLIC_ADSENSE_CLIENT=ca-pub-게시자번호` 설정
2. 이 단계에서는 광고 슬롯 변수는 비워둬도 됩니다. 검증 스크립트와 메타 태그만 출력됩니다.
3. 승인 후 `PUBLIC_AD_SLOT_TOP`, `PUBLIC_AD_SLOT_MID`, `PUBLIC_AD_SLOT_BOTTOM` 입력
4. 게시자 번호가 설정되면 빌드 시 `ads.txt`가 자동 생성됩니다.
5. 광고가 실제 노출되기 전 동의 관리 메시지와 개인정보 고지를 최종 확인합니다.
