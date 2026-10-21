import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content', 'posts');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://life.pagero.kr').replace(/\/$/, '');
const EMAIL = process.env.PUBLIC_CONTACT_EMAIL || 'info@pagero.kr';
const ADSENSE_CLIENT = process.env.PUBLIC_ADSENSE_CLIENT || 'ca-pub-1906196934401001';
const ADSENSE_VERIFY_ENABLED = process.env.PUBLIC_ADSENSE_VERIFY_ENABLED !== 'false';
const ADSENSE_ADS_ENABLED = process.env.PUBLIC_ADSENSE_ADS_ENABLED === 'true';
const SLOTS = {
  top: process.env.PUBLIC_AD_SLOT_TOP || '',
  mid: process.env.PUBLIC_AD_SLOT_MID || '',
  bottom: process.env.PUBLIC_AD_SLOT_BOTTOM || '',
};

const SITE = {
  name: '생활비서',
  tagline: '자동차 행정과 생활지원 정책을 쉽게',
  description: '자동차 세금·검사·이전등록과 정부지원·생활정책을 공식 출처 기반으로 정리하는 생활정보 사이트입니다.',
};
const CAT = {
  car: {
    label: '자동차 생활행정',
    short: '자동차',
    icon: 'CAR',
    desc: '자동차 검사, 이전등록, 세금, 과태료와 차량 관련 지원제도를 정리합니다.',
  },
  support: {
    label: '정부지원·생활정책',
    short: '지원정책',
    icon: 'GOV',
    desc: '중앙정부와 지자체 지원사업의 신청 조건과 서류를 안내합니다.',
  },
};

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));
const safe = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const fmt = (date) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
}).format(new Date(`${date}T00:00:00+09:00`));
const canon = (pathname) => `${SITE_URL}${pathname}`;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const posts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
const mkdir = (dir) => fs.mkdirSync(dir, { recursive: true });

function copy(src, dst) {
  if (!fs.existsSync(src)) return;
  mkdir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dst, entry.name);
    if (entry.isDirectory()) copy(source, target);
    else fs.copyFileSync(source, target);
  }
}

function write(url, content) {
  const relative = url.replace(/^\//, '');
  const file = url.endsWith('/') ? path.join(DIST, relative, 'index.html') : path.join(DIST, relative);
  mkdir(path.dirname(file));
  fs.writeFileSync(file, content);
}

function inline(value) {
  return esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function markdown(src = '') {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const output = [];
  let paragraph = [];
  let list = '';

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    output.push(`</${list}>`);
    list = '';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (heading) {
      flushParagraph();
      flushList();
      output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    if (unordered || ordered) {
      flushParagraph();
      const nextList = unordered ? 'ul' : 'ol';
      if (list !== nextList) {
        flushList();
        list = nextList;
        output.push(`<${nextList}>`);
      }
      output.push(`<li>${inline((unordered || ordered)[1])}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return output.join('\n');
}

function nav(pathname) {
  const active = pathname === '/'
    ? 'home'
    : pathname.startsWith('/car/')
      ? 'car'
      : pathname.startsWith('/support/')
        ? 'support'
        : '';

  return [
    ['home', '/', '홈'],
    ['car', '/car/', '자동차 생활행정'],
    ['support', '/support/', '정부지원·생활정책'],
    ['', '/about/', '사이트 소개'],
  ].map(([key, href, label]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}

function header(pathname) {
  return `<a class="skip-link" href="#main-content">본문 바로가기</a><header class="site-header"><div class="top-strip"><div class="top-strip-inner"><span>공식 출처와 확인일을 함께 표시합니다.</span><span>독립 생활정보 사이트 · 정부기관 아님</span></div></div><div class="header-inner"><a class="brand" href="/"><span class="brand-mark">생</span><span class="brand-copy"><strong>${SITE.name}</strong><span>${SITE.tagline}</span></span></a><form class="header-search" action="/search/" method="get"><input name="q" type="search" placeholder="자동차 검사, 지원금 검색" aria-label="사이트 검색"><button>검색</button></form></div><nav class="main-nav"><div class="nav-inner">${nav(pathname)}</div></nav></header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="footer-inner"><div><h2>${SITE.name}</h2><p>${SITE.description}</p><p><strong>중요:</strong> 정부기관이 아니며 신청·민원 처리를 대행하지 않습니다.</p></div><div><h3>콘텐츠</h3><ul><li><a href="/car/">자동차 생활행정</a></li><li><a href="/support/">정부지원·생활정책</a></li><li><a href="/rss.xml">RSS</a></li><li><a href="/llms.txt">llms.txt</a></li></ul></div><div><h3>운영 정보</h3><ul><li><a href="/about/">사이트 소개</a></li><li><a href="/privacy-policy/">개인정보처리방침</a></li><li><a href="/contact/">문의</a></li></ul></div></div><div class="footer-bottom"><div class="top-strip-inner">© 2026 ${SITE.name}</div></div></footer>`;
}

const org = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  email: EMAIL,
});
const website = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.name,
  url: SITE_URL,
  description: SITE.description,
  inLanguage: 'ko-KR',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

function adsenseVerification() {
  if (!ADSENSE_CLIENT || !ADSENSE_VERIFY_ENABLED) return '';
  return `<meta name="google-adsense-account" content="${esc(ADSENSE_CLIENT)}"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>`;
}

function page({ pathname, title, description, body, type = 'website', schema = [], noindex = false }) {
  const fullTitle = title === SITE.name ? `${SITE.name} | ${SITE.tagline}` : `${title} | ${SITE.name}`;
  const url = canon(pathname);
  const json = [org(), website(), ...schema]
    .map((item) => `<script type="application/ld+json">${safe(item)}</script>`)
    .join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}"><meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}"><meta property="og:locale" content="ko_KR"><meta property="og:type" content="${type}"><meta property="og:site_name" content="${SITE.name}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE_URL}/og-default.svg"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><link rel="alternate" type="application/rss+xml" href="/rss.xml"><link rel="stylesheet" href="/styles.css">${adsenseVerification()}${json}</head><body>${header(pathname)}<main id="main-content">${body}</main>${footer()}</body></html>`;
}

function card(post) {
  const category = CAT[post.category];
  return `<article class="post-card"><a class="post-thumb ${post.category}" href="/${post.category}/${post.slug}/">${category.icon}</a><div class="post-body"><div class="post-meta"><span class="badge ${post.category}">${category.short}</span><time datetime="${post.publishedAt}">${fmt(post.publishedAt)}</time><span>확인 ${fmt(post.reviewedAt)}</span></div><h3><a href="/${post.category}/${post.slug}/">${esc(post.title)}</a></h3><p>${esc(post.description)}</p></div></article>`;
}

function side(current = '') {
  return `<aside class="sidebar"><section class="sidebar-card"><h2>최근 확인 글</h2><ul class="sidebar-list">${posts.filter((post) => post.slug !== current).slice(0, 6).map((post) => `<li><a href="/${post.category}/${post.slug}/">${esc(post.title)}</a></li>`).join('')}</ul></section><section class="sidebar-card"><h2>안내</h2><p class="sidebar-note">지원조건과 금액은 바뀔 수 있습니다. 각 글의 확인일과 공식 출처를 함께 확인하세요.</p></section></aside>`;
}

function crumb(post) {
  return `<nav class="breadcrumbs"><ol><li><a href="/">홈</a></li><li><a href="/${post.category}/">${CAT[post.category].label}</a></li><li>${esc(post.title)}</li></ol></nav>`;
}

function ad(key) {
  const slot = SLOTS[key];
  if (!ADSENSE_ADS_ENABLED || !ADSENSE_CLIENT || !slot) return '';
  return `<div class="ad-slot" data-enabled="true"><span class="ad-label">ADVERTISEMENT</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADSENSE_CLIENT)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function article(post) {
  const pathname = `/${post.category}/${post.slug}/`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: canon(pathname),
    inLanguage: 'ko-KR',
    author: { '@type': 'Organization', name: post.author, url: `${SITE_URL}/about/` },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
    },
    citation: post.sources.map((source) => source.url),
    about: post.keywords,
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
  const body = `<div class="site-shell"><div class="content-grid"><article class="article-shell">${crumb(post)}<header class="article-header"><span class="badge ${post.category}">${CAT[post.category].short}</span><h1>${esc(post.title)}</h1><p class="article-dek">${esc(post.description)}</p><div class="article-meta"><span>작성 ${fmt(post.publishedAt)}</span><span>수정 ${fmt(post.updatedAt)}</span><span>공식자료 확인 ${fmt(post.reviewedAt)}</span><span>${esc(post.author)}</span></div></header><div class="article-content"><section class="key-summary"><h2>핵심 요약</h2><ul>${post.keyPoints.map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>${ad('top')}${markdown(post.body)}${ad('mid')}<div class="disclaimer">생활비서는 정부기관이 아니며 신청 결과를 보장하지 않습니다. 공식 공고와 담당기관 안내를 최종 기준으로 확인하세요.</div><div class="article-actions">${post.primaryCta ? `<a class="wp-button-secondary" href="${post.primaryCta.href}">${esc(post.primaryCta.label)}</a>` : ''}${post.officialCta ? `<a class="wp-button" href="${post.officialCta.href}" target="_blank" rel="noopener noreferrer">${esc(post.officialCta.label)}</a>` : ''}</div>${ad('bottom')}<section class="source-box"><h2>공식 출처</h2><ul class="source-list">${post.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${esc(source.name)}</a> · 확인 ${fmt(source.checkedAt)}</li>`).join('')}</ul></section><section class="faq-box"><h2>자주 묻는 질문</h2>${post.faqs.map((faq) => `<details class="faq-item"><summary>${esc(faq.question)}</summary><div><p>${esc(faq.answer)}</p></div></details>`).join('')}</section></div></article>${side(post.slug)}</div></div>`;

  return page({
    pathname,
    title: post.title,
    description: post.description,
    body,
    type: 'article',
    schema: [articleSchema, faqSchema],
  });
}

function listing(key) {
  const category = CAT[key];
  const list = posts.filter((post) => post.category === key);
  const body = `<div class="site-shell"><div class="content-grid"><div><section class="category-hero"><h1>${category.label}</h1><p>${category.desc}</p></section><section class="main-column section"><div class="section-header"><div><h2>전체 글</h2><p>최근 확인일 기준입니다.</p></div></div><div class="post-list">${list.map(card).join('')}</div></section></div>${side()}</div></div>`;
  return page({ pathname: `/${key}/`, title: category.label, description: category.desc, body });
}

function staticPage(pathname, title, description, content) {
  write(pathname, page({
    pathname,
    title,
    description,
    body: `<div class="site-shell"><article class="page-box">${content}</article></div>`,
  }));
}

fs.rmSync(DIST, { recursive: true, force: true });
mkdir(DIST);
copy(PUBLIC, DIST);

const featured = posts.filter((post) => post.featured).slice(0, 8);
write('/', page({
  pathname: '/',
  title: SITE.name,
  description: SITE.description,
  body: `<div class="site-shell"><div class="content-grid"><div class="main-column"><section class="hero"><span class="hero-kicker">LIFE ADMINISTRATION GUIDE</span><h1>복잡한 생활행정과 지원정책을 쉽게 확인하세요.</h1><p>자동차 검사·이전등록·세금부터 정부와 지자체 지원사업까지 공식 출처와 확인일을 기준으로 정리합니다.</p><div class="hero-actions"><a class="wp-button" href="/car/">자동차 정보 보기</a><a class="wp-button-secondary" href="/support/">지원정책 찾기</a></div></section><section class="section"><div class="category-grid">${Object.entries(CAT).map(([key, category]) => `<article class="category-panel"><span class="category-icon">${category.icon}</span><h3>${category.label}</h3><p>${category.desc}</p><a class="wp-button-secondary" href="/${key}/">${category.short} 글 보기</a></article>`).join('')}</div></section><section class="section"><div class="section-header"><div><h2>최신 확인 콘텐츠</h2><p>공식자료 확인일과 출처를 공개합니다.</p></div></div><div class="post-list">${(featured.length ? featured : posts).map(card).join('')}</div></section></div>${side()}</div></div>`,
}));
write('/car/', listing('car'));
write('/support/', listing('support'));
for (const post of posts) write(`/${post.category}/${post.slug}/`, article(post));

staticPage('/about/', '사이트 소개', '생활비서 운영 목적과 정보 제공 기준입니다.', `<h1>생활비서는 어떤 사이트인가요?</h1><p>자동차 생활행정과 정부·공공기관의 생활지원 정보를 읽기 쉬운 언어로 정리하는 독립 정보 사이트입니다.</p><h2>정부기관과의 관계</h2><p><strong>정부기관이나 공공기관의 공식 사이트가 아닙니다.</strong> 지원금 지급이나 민원 처리를 대행하지 않으며 결과를 보장하지 않습니다.</p><h2>운영 주체</h2><p>운영: 생활비서 편집팀<br>문의: <a href="mailto:${EMAIL}">${EMAIL}</a></p><h2>작성·검수 방식</h2><p>생활비서 편집팀은 정부 부처·공공기관·지자체가 공개한 안내와 법령을 확인한 뒤 대상, 기간, 금액, 신청 순서를 독자가 대조하기 쉬운 형태로 정리합니다. 각 글에 공식자료 확인일과 원문 링크를 표시하며, 제도 내용이 달라지면 확인일과 수정일을 함께 갱신합니다.</p><p>개별 신청자의 자격을 판정하거나 법률·세무 상담을 제공하지 않습니다. 실제 신청 전에는 글 하단의 공식 출처와 담당기관 안내를 최종 기준으로 확인해야 합니다.</p><h2>오류 수정 원칙</h2><p>공식 출처 변경, 링크 오류, 수치·기간 오류 제보를 확인하면 원문을 다시 대조한 뒤 수정합니다. 오류 제보는 <a href="mailto:${EMAIL}">${EMAIL}</a>로 받을 수 있습니다.</p><h2>광고와 편집의 분리</h2><p>광고주는 글의 선정과 평가에 관여하지 않으며 광고와 본문·이동 버튼을 구분합니다.</p>`);
staticPage('/privacy-policy/', '개인정보처리방침', '생활비서의 개인정보와 쿠키 처리 안내입니다.', `<h1>개인정보처리방침</h1><p>시행일: 2026년 7월 13일</p><h2>수집 정보</h2><p>회원가입 기능은 없습니다. 서버와 보안 서비스가 접속 로그를 처리할 수 있습니다.</p><h2>쿠키와 광고</h2><p>Google AdSense 적용 시 광고 제공과 성과 측정을 위해 쿠키 또는 유사 기술이 사용될 수 있습니다.</p><h2>문의</h2><p><a href="mailto:${EMAIL}">${EMAIL}</a></p>`);
staticPage('/contact/', '문의', '콘텐츠 오류와 운영 문의 방법입니다.', `<h1>문의</h1><p>내용 오류, 공식 출처 변경, 링크 오류에 관한 문의를 받습니다.</p><p><a class="wp-button" href="mailto:${EMAIL}">${EMAIL}</a></p><p>지원금 신청 대행, 민원 처리, 개별 자격 판정은 제공하지 않습니다.</p>`);

const searchScript = `<script>let i=[];const q=document.querySelector('#page-search'),r=document.querySelector('#search-results'),e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));fetch('/search-index.json').then(x=>x.json()).then(x=>{i=x;const v=new URLSearchParams(location.search).get('q')||'';q.value=v;if(v)go(v)});function go(v){v=v.trim().toLowerCase();const f=i.filter(p=>[p.title,p.description,...p.keywords].join(' ').toLowerCase().includes(v));r.innerHTML=f.length?f.map(p=>'<article class="search-result"><h2><a href="'+p.url+'">'+e(p.title)+'</a></h2><p>'+e(p.description)+'</p></article>').join(''):'<p>일치하는 글이 없습니다.</p>'}document.querySelector('#page-search-form').addEventListener('submit',x=>{x.preventDefault();go(q.value);history.replaceState(null,'','?q='+encodeURIComponent(q.value))});</script>`;
write('/search/', page({
  pathname: '/search/',
  title: '사이트 검색',
  description: '생활비서 콘텐츠 검색',
  noindex: true,
  body: `<div class="site-shell"><article class="page-box"><h1>사이트 검색</h1><form id="page-search-form" class="search-box"><input id="page-search" type="search" placeholder="검색어"><button>검색</button></form><div id="search-results"></div></article></div>${searchScript}`,
}));
write('/search-index.json', JSON.stringify(posts.map((post) => ({
  title: post.title,
  description: post.description,
  keywords: post.keywords,
  url: `/${post.category}/${post.slug}/`,
}))));
write('/rss.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE.name}</title><link>${SITE_URL}</link><description>${SITE.description}</description>${posts.map((post) => `<item><title><![CDATA[${post.title}]]></title><link>${canon(`/${post.category}/${post.slug}/`)}</link><guid>${canon(`/${post.category}/${post.slug}/`)}</guid><pubDate>${new Date(`${post.publishedAt}T00:00:00+09:00`).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);

const urls = ['/', '/car/', '/support/', '/about/', '/privacy-policy/', '/contact/', ...posts.map((post) => `/${post.category}/${post.slug}/`)];
write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${canon(url)}</loc></url>`).join('')}</urlset>`);
write('/sitemap-index.xml', `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE_URL}/sitemap.xml</loc></sitemap></sitemapindex>`);
write('/llms.txt', `# ${SITE.name}\n\n> ${SITE.description}\n\n## 주요 섹션\n- [자동차 생활행정](${SITE_URL}/car/)\n- [정부지원·생활정책](${SITE_URL}/support/)\n\n## 최신 콘텐츠\n${posts.map((post) => `- [${post.title}](${canon(`/${post.category}/${post.slug}/`)})`).join('\n')}\n`);
write('/manifest.webmanifest', JSON.stringify({
  name: SITE.name,
  short_name: SITE.name,
  start_url: '/',
  display: 'standalone',
  background_color: '#f4f5f7',
  theme_color: '#1769e0',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
}));

const publisher = ADSENSE_CLIENT.match(/^ca-pub-(\d+)$/);
if (publisher) write('/ads.txt', `google.com, pub-${publisher[1]}, DIRECT, f08c47fec0942fa0\n`);

console.log(`Built ${posts.length} article(s), ${urls.length} indexable URL(s) into ${DIST}; AdSense verification ${ADSENSE_VERIFY_ENABLED ? 'enabled' : 'disabled'}, ad slots ${ADSENSE_ADS_ENABLED ? 'enabled' : 'disabled'}.`);
