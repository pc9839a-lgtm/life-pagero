import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://life.pagero.kr').replace(/\/$/, '');
const ADSENSE_CLIENT = process.env.PUBLIC_ADSENSE_CLIENT || '';
const AD_SLOTS = {
  top: process.env.PUBLIC_AD_SLOT_TOP || '',
  mid: process.env.PUBLIC_AD_SLOT_MID || '',
};
const CATEGORY = {
  car: { label: '자동차 생활행정', short: '자동차' },
  support: { label: '정부지원·생활정책', short: '지원정책' },
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const escapeAttr = escapeHtml;
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const fmtDate = (date) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(`${date}T00:00:00+09:00`));
const canonical = (pathname) => `${SITE_URL}${pathname}`;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

function inlineMarkdown(value) {
  let out = escapeHtml(value);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return out;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const out = [];
  let paragraph = [];
  let listType = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    out.push(`</${listType}>`);
    listType = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    const ul = trimmed.match(/^[-*]\s+(.+)$/);
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (!trimmed) { flushParagraph(); closeList(); continue; }
    if (heading) { flushParagraph(); closeList(); const level = heading[1].length; out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
    if (ul || ol) {
      flushParagraph();
      const nextType = ul ? 'ul' : 'ol';
      if (listType !== nextType) { closeList(); listType = nextType; out.push(`<${listType}>`); }
      out.push(`<li>${inlineMarkdown((ul || ol)[1])}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph(); closeList();
  return out.join('\n');
}

function ad(slotName) {
  const slot = AD_SLOTS[slotName];
  if (!ADSENSE_CLIENT || !slot) return '';
  return `<div class="ad-slot" data-enabled="true"><span class="ad-label">ADVERTISEMENT</span><ins class="adsbygoogle" style="display:block" data-ad-client="${escapeAttr(ADSENSE_CLIENT)}" data-ad-slot="${escapeAttr(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function pagePath(post, pageNumber) {
  return pageNumber === 1 ? `/${post.category}/${post.slug}/` : `/${post.category}/${post.slug}/${pageNumber}/`;
}

function progress(post, pageNumber, total) {
  const items = Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    const href = pagePath(post, number);
    const current = number === pageNumber;
    const completed = number < pageNumber;
    const className = ['series-step', current ? 'is-current' : '', completed ? 'is-complete' : ''].filter(Boolean).join(' ');
    const content = current
      ? `<span aria-current="step"><b>${number}</b><em>${number}단계</em></span>`
      : completed
        ? `<a href="${href}"><b>${number}</b><em>${number}단계</em></a>`
        : `<span aria-disabled="true"><b>${number}</b><em>${number}단계</em></span>`;
    return `<li class="${className}">${content}</li>`;
  }).join('');
  return `<nav class="series-progress" aria-label="콘텐츠 진행 단계"><div class="series-progress-head"><strong>${pageNumber} / ${total}</strong><span>하나의 콘텐츠를 단계별로 나누어 안내합니다.</span></div><ol>${items}</ol></nav>`;
}

function breadcrumbs(post, pageNumber, part) {
  return `<nav class="breadcrumbs" aria-label="현재 위치"><ol><li><a href="/">홈</a></li><li><a href="/${post.category}/">${escapeHtml(CATEGORY[post.category].label)}</a></li><li><a href="/${post.category}/${post.slug}/">${escapeHtml(post.title)}</a></li>${pageNumber > 1 ? `<li>${pageNumber}단계 · ${escapeHtml(part.title)}</li>` : ''}</ol></nav>`;
}

function sources(post, clickable = false) {
  return `<section class="source-box"><h2>자료 기준</h2><ul class="source-list">${post.sources.map((source) => `<li>${clickable ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>` : `<span>${escapeHtml(source.name)}</span>`} · 확인 ${fmtDate(source.checkedAt)}</li>`).join('')}</ul></section>`;
}

function faqs(post) {
  return `<section class="faq-box"><h2>자주 묻는 질문</h2>${post.faqs.map((faq) => `<details class="faq-item"><summary>${escapeHtml(faq.question)}</summary><div><p>${escapeHtml(faq.answer)}</p></div></details>`).join('')}</section>`;
}

function articleShell(post, part, pageNumber, total) {
  const previousPath = pageNumber > 1 ? pagePath(post, pageNumber - 1) : '';
  const nextPath = pageNumber < total ? pagePath(post, pageNumber + 1) : '';
  const official = post.officialCta;
  const actions = pageNumber < total
    ? `<div class="series-actions">${previousPath ? `<a class="wp-button-secondary" href="${previousPath}">이전 단계</a>` : '<span></span>'}<a class="wp-button series-next" href="${nextPath}">${escapeHtml(part.nextLabel || '다음 내용 확인하기')} <span aria-hidden="true">→</span></a></div>`
    : `<div class="series-actions"><a class="wp-button-secondary" href="${previousPath}">이전 단계</a>${official ? `<a class="wp-button series-next" href="${official.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(official.label)}</a>` : ''}</div>`;

  const partFaqs = pageNumber === total ? faqs(post) : '';
  return `<article class="article-shell">${breadcrumbs(post, pageNumber, part)}<header class="article-header"><span class="badge ${post.category}">${CATEGORY[post.category].short}</span><span class="series-kicker">${pageNumber}단계 · ${escapeHtml(part.title)}</span><h1>${escapeHtml(post.title)}</h1><p class="article-dek">${escapeHtml(part.description)}</p><div class="article-meta"><span>작성 ${fmtDate(post.publishedAt)}</span><span>수정 ${fmtDate(post.updatedAt)}</span><span>공식자료 확인 ${fmtDate(post.reviewedAt)}</span><span>${escapeHtml(post.author)}</span></div></header><div class="article-content">${progress(post, pageNumber, total)}<section class="key-summary"><h2>이번 단계 핵심 요약</h2><ul>${part.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul></section>${ad('top')}${markdownToHtml(part.body)}${ad('mid')}<div class="disclaimer">생활비서는 정부기관이 아니며 신청 결과를 보장하지 않습니다. 공식 공고와 담당기관 안내를 최종 기준으로 확인하세요.</div>${actions}${sources(post, pageNumber === total)}${partFaqs}</div></article>`;
}

function replaceMeta(html, post, part, pageNumber, total) {
  const pathname = pagePath(post, pageNumber);
  const url = canonical(pathname);
  const title = pageNumber === 1 ? `${post.title} | 생활비서` : `${post.title} ${pageNumber}/${total} - ${part.title} | 생활비서`;
  const description = part.description;
  const previous = pageNumber > 1 ? `<link rel="prev" href="${canonical(pagePath(post, pageNumber - 1))}">` : '';
  const next = pageNumber < total ? `<link rel="next" href="${canonical(pagePath(post, pageNumber + 1))}">` : '';
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${post.title} - ${part.title}`,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url,
    inLanguage: 'ko-KR',
    isPartOf: { '@type': 'CreativeWorkSeries', name: post.title, url: canonical(pagePath(post, 1)) },
    position: pageNumber,
    author: { '@type': 'Organization', name: post.author, url: `${SITE_URL}/about/` },
    publisher: { '@type': 'Organization', name: '생활비서', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` } },
    citation: post.sources.map((source) => source.url),
    about: post.keywords,
  };

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">${previous}${next}`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  html = html.replace(/<script type="application\/ld\+json">\{[^<]*"@type":"Article"[^<]*<\/script>/, `<script type="application/ld+json">${safeJson(articleSchema)}</script>`);
  if (pageNumber !== total) {
    html = html.replace(/<script type="application\/ld\+json">\{[^<]*"@type":"FAQPage"[^<]*<\/script>/, '');
  }
  if (!html.includes('/series.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/series.css"></head>');
  return html;
}

function writePage(post, part, pageNumber, total, baseHtml) {
  let html = replaceMeta(baseHtml, post, part, pageNumber, total);
  html = html.replace(/<article class="article-shell">[\s\S]*?<\/article>/, articleShell(post, part, pageNumber, total));
  const pathname = pagePath(post, pageNumber);
  const target = path.join(DIST, pathname.replace(/^\//, ''), 'index.html');
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, html);
}

const seriesPosts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => Array.isArray(post.series?.parts) && post.series.parts.length >= 2);

const extraUrls = [];
for (const post of seriesPosts) {
  const baseFile = path.join(DIST, post.category, post.slug, 'index.html');
  if (!fs.existsSync(baseFile)) throw new Error(`Base article not found: ${baseFile}`);
  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const total = post.series.parts.length;
  post.series.parts.forEach((part, index) => {
    const pageNumber = index + 1;
    writePage(post, part, pageNumber, total, baseHtml);
    if (pageNumber > 1) extraUrls.push(pagePath(post, pageNumber));
  });
}

if (extraUrls.length) {
  const sitemapFile = path.join(DIST, 'sitemap.xml');
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  const additions = extraUrls.map((pathname) => `<url><loc>${canonical(pathname)}</loc></url>`).join('');
  sitemap = sitemap.replace('</urlset>', `${additions}</urlset>`);
  fs.writeFileSync(sitemapFile, sitemap);
}

console.log(`Built ${seriesPosts.length} paginated article series, ${extraUrls.length} additional page(s).`);
