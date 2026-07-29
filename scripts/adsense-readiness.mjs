import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const CONTENT_ROOT = path.resolve('content/posts');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://life.pagero.kr').replace(/\/$/, '');
const CONTACT_EMAIL = process.env.PUBLIC_CONTACT_EMAIL || 'info@pagero.kr';
const ADSENSE_CLIENT = process.env.PUBLIC_ADSENSE_CLIENT || 'ca-pub-1906196934401001';
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const pagePath = (post, pageNumber) => pageNumber === 1
  ? `/${post.category}/${post.slug}/`
  : `/${post.category}/${post.slug}/${pageNumber}/`;
const pageFile = (pathname) => path.join(DIST, pathname.replace(/^\//, ''), 'index.html');

function replaceSingle(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

function injectBefore(html, marker, content) {
  if (html.includes(content)) return html;
  return html.replace(marker, `${content}${marker}`);
}

function rewriteJsonLd(html, post, part, pageNumber, url) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return full;
    }

    if (data?.['@type'] === 'Article') {
      data.headline = part.title;
      data.description = part.description;
      data.mainEntityOfPage = url;
      data.author = {
        '@type': 'Organization',
        name: post.author || '생활비서 편집팀',
        url: `${SITE_URL}/editorial-standards/`,
      };
      return `<script type="application/ld+json">${safeJson(data)}</script>`;
    }

    return full;
  });
}

function rewriteArticlePage(html, post, part, pageNumber) {
  const pathname = pagePath(post, pageNumber);
  const url = `${SITE_URL}${pathname}`;
  const basePath = pagePath(post, 1);
  const pageTitle = `${part.title} | 생활비서`;

  html = replaceSingle(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  html = replaceSingle(html, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(part.description)}">`);
  html = replaceSingle(html, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}">`);
  html = replaceSingle(html, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(part.description)}">`);

  const headerPattern = /(<header class="article-header">[\s\S]*?<span class="badge [^"]+">[\s\S]*?<\/span>)<h1>[\s\S]*?<\/h1>/i;
  const seriesLink = `<p class="article-series-name"><a href="${basePath}">${escapeHtml(post.title)}</a></p>`;
  html = html.replace(headerPattern, `$1${seriesLink}<h1>${escapeHtml(part.title)}</h1>`);

  html = html.replace(
    /<span>생활비서 편집팀<\/span>/g,
    '<span><a class="article-author" href="/editorial-standards/">생활비서 편집팀</a></span>',
  );

  const feedback = `<p class="article-feedback"><a href="/contact/">정보가 달라졌거나 링크가 열리지 않나요? 오류를 알려주세요.</a></p>`;
  if (!html.includes('class="article-feedback"')) {
    html = html.replace(/(<div class="disclaimer">[\s\S]*?<\/div>)/i, `$1${feedback}`);
  }

  html = rewriteJsonLd(html, post, part, pageNumber, url);
  return html;
}

function standardsPage() {
  const title = '생활비서 콘텐츠 작성·검수 기준';
  const description = '생활비서가 정부·공공기관 자료를 확인하고 콘텐츠를 작성, 수정, 검수하는 방식과 광고·편집 분리 원칙을 공개합니다.';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    url: `${SITE_URL}/editorial-standards/`,
    description,
    publisher: {
      '@type': 'Organization',
      name: '생활비서',
      url: SITE_URL,
      email: CONTACT_EMAIL,
    },
  };

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${SITE_URL}/editorial-standards/"><meta property="og:type" content="website"><meta property="og:site_name" content="생활비서"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${SITE_URL}/editorial-standards/"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/adsense-readiness.css"><meta name="google-adsense-account" content="${escapeHtml(ADSENSE_CLIENT)}"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}" crossorigin="anonymous"></script><script type="application/ld+json">${safeJson(schema)}</script></head><body><a class="skip-link" href="#main-content">본문 바로가기</a><header class="site-header"><div class="top-strip"><div class="top-strip-inner"><span>공식 출처와 확인일을 함께 표시합니다.</span><span>독립 생활정보 사이트 · 정부기관 아님</span></div></div><div class="header-inner"><a class="brand" href="/"><span class="brand-mark">생</span><span class="brand-copy"><strong>생활비서</strong><span>자동차 행정과 생활지원 정책을 쉽게</span></span></a></div><nav class="main-nav"><div class="nav-inner"><a href="/">홈</a><a href="/car/">자동차 생활행정</a><a href="/support/">정부지원·생활정책</a><a href="/about/">사이트 소개</a></div></nav></header><main id="main-content"><div class="site-shell"><article class="page-box editorial-standards"><h1>${title}</h1><p>생활비서는 자동차 행정과 정부·공공기관의 생활지원 정보를 독자가 실제로 확인하고 행동할 수 있도록 정리하는 독립 정보 사이트입니다. 정부기관이나 공공기관의 공식 사이트가 아니며 신청, 심사, 지급 결과를 대행하거나 보장하지 않습니다.</p><h2>누가 작성하나요?</h2><p>콘텐츠는 생활비서 편집팀 명의로 발행합니다. 편집팀은 정책명, 대상, 금액, 신청기간, 필요서류와 공식 신청 경로를 정부 부처·공공기관·지방자치단체의 공개 자료와 대조해 정리합니다. 개별 자격 판정이나 법률·세무 상담은 제공하지 않습니다.</p><h2>어떻게 확인하나요?</h2><ol><li>정책 또는 민원 서비스의 공식 원문을 먼저 확인합니다.</li><li>대상, 기간, 금액, 예외조건과 신청 경로를 서로 다른 공식 자료로 교차 확인합니다.</li><li>각 글에 자료 확인일과 원문 링크를 표시합니다.</li><li>공식 공고가 바뀌면 수정일과 확인일을 함께 갱신합니다.</li><li>독자가 공식 사이트에서 다시 확인해야 하는 항목을 명확히 구분합니다.</li></ol><h2>자동화와 AI는 어떻게 사용하나요?</h2><p>문장 초안 정리, 맞춤법 점검, 형식 통일과 누락 항목 탐지에 자동화 도구나 AI를 활용할 수 있습니다. 다만 금액, 기간, 대상, 신청 경로와 공식 링크는 공개된 공식 자료를 기준으로 최종 검수하며, 자동 생성 결과만으로 발행하지 않습니다.</p><h2>어떤 추가 가치를 제공하나요?</h2><p>공식 안내를 그대로 옮기지 않고 신청 전에 준비할 정보, 자주 발생하는 입력 오류, 예외상황, 완료 후 확인사항과 다음 행동 순서를 독자가 이해하기 쉬운 형태로 재구성합니다. 검색 결과에서 다시 여러 사이트를 찾아보지 않도록 관련 조건과 주의사항을 한 흐름으로 연결하는 것이 목적입니다.</p><h2>오류 수정과 제보</h2><p>수치, 기간, 대상, 공식 링크가 달라졌거나 설명이 불명확한 경우 <a href="/contact/">문의 페이지</a> 또는 <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a>로 알려주세요. 공식 원문을 다시 확인한 뒤 필요한 내용을 수정합니다.</p><h2>광고와 편집의 분리</h2><p>광고주는 주제 선정, 사실 확인, 평가와 수정에 관여하지 않습니다. 광고는 본문, 다음 내용 버튼, 공식 신청·조회 링크와 시각적으로 구분하고 광고 클릭을 유도하지 않습니다.</p><p class="page-updated">최종 업데이트: ${TODAY}</p></article></div></main><footer class="site-footer"><div class="footer-inner"><div><h2>생활비서</h2><p>자동차 세금·검사·이전등록과 정부지원·생활정책을 공식 출처 기반으로 정리합니다.</p></div><div><h3>콘텐츠</h3><ul><li><a href="/car/">자동차 생활행정</a></li><li><a href="/support/">정부지원·생활정책</a></li></ul></div><div><h3>운영 정보</h3><ul><li><a href="/about/">사이트 소개</a></li><li><a href="/editorial-standards/">작성·검수 기준</a></li><li><a href="/privacy-policy/">개인정보처리방침</a></li><li><a href="/contact/">문의</a></li></ul></div></div><div class="footer-bottom"><div class="top-strip-inner">© 2026 생활비서</div></div></footer></body></html>`;
}

function updateSitemap() {
  const file = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(file)) return;
  let xml = fs.readFileSync(file, 'utf8');
  const url = `${SITE_URL}/editorial-standards/`;
  if (xml.includes(`<loc>${url}</loc>`)) return;
  xml = xml.replace('</urlset>', `  <url><loc>${url}</loc><lastmod>${TODAY}</lastmod></url>\n</urlset>`);
  fs.writeFileSync(file, xml);
}

function injectGlobalLinks(html) {
  if (!html.includes('/adsense-readiness.css')) {
    html = injectBefore(html, '</head>', '<link rel="stylesheet" href="/adsense-readiness.css">');
  }
  if (!html.includes('href="/editorial-standards/"')) {
    html = html.replace(
      /(<li><a href="\/about\/">사이트 소개<\/a><\/li>)/,
      '$1<li><a href="/editorial-standards/">작성·검수 기준</a></li>',
    );
  }
  return html;
}

const posts = walk(CONTENT_ROOT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex && Array.isArray(post.series?.parts));

for (const post of posts) {
  post.series.parts.forEach((part, index) => {
    const pathname = pagePath(post, index + 1);
    const file = pageFile(pathname);
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, 'utf8');
    html = rewriteArticlePage(html, post, part, index + 1);
    html = injectGlobalLinks(html);
    fs.writeFileSync(file, html);
  });
}

for (const file of walk(DIST).filter((item) => item.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8');
  html = injectGlobalLinks(html);
  fs.writeFileSync(file, html);
}

const standardsDir = path.join(DIST, 'editorial-standards');
fs.mkdirSync(standardsDir, { recursive: true });
fs.writeFileSync(path.join(standardsDir, 'index.html'), standardsPage());
fs.writeFileSync(path.join(DIST, 'adsense-readiness.css'), `.article-series-name{margin:10px 0 6px;font-size:14px;font-weight:800}.article-series-name a{color:#5c6b7a;text-decoration:none}.article-series-name a:hover{text-decoration:underline}.article-author{color:inherit;text-decoration:underline;text-underline-offset:3px}.article-feedback{margin:14px 0 0;font-size:14px}.article-feedback a{font-weight:800}.editorial-standards h2{margin-top:34px}.editorial-standards ol{padding-left:22px}.editorial-standards li{margin:8px 0}.page-updated{margin-top:34px;color:#667085;font-size:14px}`);
updateSitemap();

console.log(`AdSense readiness applied to ${posts.length} article series with transparent authorship, editorial standards, feedback links, and promise-matched page titles.`);
