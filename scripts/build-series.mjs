import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://life.pagero.kr').replace(/\/$/, '');
const ADSENSE_CLIENT = process.env.PUBLIC_ADSENSE_CLIENT || 'ca-pub-1906196934401001';
const ADSENSE_ADS_ENABLED = process.env.PUBLIC_ADSENSE_ADS_ENABLED === 'true';
const AD_SLOTS = {
  top: process.env.PUBLIC_AD_SLOT_TOP || '',
  mid: process.env.PUBLIC_AD_SLOT_MID || '',
};

const CATEGORY = {
  car: { label: '자동차 생활행정', short: '자동차' },
  support: { label: '정부지원·생활정책', short: '지원정책' },
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const fmtDate = (date) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
}).format(new Date(`${date}T00:00:00+09:00`));
const canonical = (pathname) => `${SITE_URL}${pathname}`;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return output.join('\n');
}

function ad(slotName) {
  const slot = AD_SLOTS[slotName];
  if (!ADSENSE_ADS_ENABLED || !ADSENSE_CLIENT || !slot) return '';
  return `<div class="ad-slot" data-enabled="true"><span class="ad-label">ADVERTISEMENT</span><ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(ADSENSE_CLIENT)}" data-ad-slot="${escapeHtml(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function pagePath(post, pageNumber) {
  return pageNumber === 1
    ? `/${post.category}/${post.slug}/`
    : `/${post.category}/${post.slug}/${pageNumber}/`;
}

function breadcrumbs(post, pageNumber, part) {
  const current = pageNumber === 1 ? post.title : part.title;
  return `<nav class="breadcrumbs" aria-label="현재 위치"><ol><li><a href="/">홈</a></li><li><a href="/${post.category}/">${escapeHtml(CATEGORY[post.category].label)}</a></li>${pageNumber > 1 ? `<li><a href="/${post.category}/${post.slug}/">${escapeHtml(post.title)}</a></li>` : ''}<li>${escapeHtml(current)}</li></ol></nav>`;
}

function sources(post, clickable) {
  return `<section class="source-box"><h2>자료 기준</h2><ul class="source-list">${post.sources.map((source) => `<li>${clickable ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>` : `<span>${escapeHtml(source.name)}</span>`} · 확인 ${fmtDate(source.checkedAt)}</li>`).join('')}</ul></section>`;
}

function faqs(post) {
  return `<section class="faq-box"><h2>자주 묻는 질문</h2>${post.faqs.map((faq) => `<details class="faq-item"><summary>${escapeHtml(faq.question)}</summary><div><p>${escapeHtml(faq.answer)}</p></div></details>`).join('')}</section>`;
}

function photo(part, eager = false) {
  if (!part.image) return '';
  return `<figure class="series-photo"><img src="${escapeHtml(part.image)}" alt="${escapeHtml(part.imageAlt || part.title)}" width="1400" height="788" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`;
}

function summary(part) {
  return `<section class="key-summary"><h2>핵심 내용</h2><ul>${part.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul></section>`;
}

function fullGuide(post) {
  return `<div class="series-full-guide" data-full-guide="true">${post.series.parts.map((part, index) => {
    const detailPath = pagePath(post, index + 1);
    const detailLink = index === 0
      ? ''
      : `<p class="series-detail-link"><a href="${detailPath}">${escapeHtml(part.title)}만 따로 보기</a></p>`;
    return `<section class="series-full-part" data-part="${index + 1}" id="content-${index + 1}">${photo(part, index === 0)}<h2 class="series-part-title">${escapeHtml(part.title)}</h2><p class="series-part-description">${escapeHtml(part.description)}</p>${summary(part)}${index === 1 ? ad('mid') : ''}${markdownToHtml(part.body)}${detailLink}</section>`;
  }).join('')}</div>`;
}

function actions(post, part, pageNumber, total) {
  const previousPath = pageNumber > 1 ? pagePath(post, pageNumber - 1) : '';
  const nextPath = pageNumber < total ? pagePath(post, pageNumber + 1) : '';
  const official = post.officialCta;

  if (pageNumber < total) {
    return `<div class="series-actions">${previousPath ? `<a class="wp-button-secondary" href="${previousPath}">이전 내용</a>` : '<span aria-hidden="true"></span>'}<a class="wp-button series-next" href="${nextPath}">${escapeHtml(part.nextLabel || '다음 내용 확인하기')} <span aria-hidden="true">→</span></a></div>`;
  }

  return `<div class="series-actions"><a class="wp-button-secondary" href="${previousPath}">이전 내용</a>${official ? `<a class="wp-button series-next" href="${escapeHtml(official.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(official.label)}</a>` : ''}</div>`;
}

function articleShell(post, part, pageNumber, total) {
  const isBase = pageNumber === 1;
  const headerDescription = isBase ? post.description : part.description;
  const body = isBase
    ? `${ad('top')}${fullGuide(post)}`
    : `${photo(part)}<div class="article-content"><h2 class="series-part-title">${escapeHtml(part.title)}</h2>${summary(part)}${ad('top')}${markdownToHtml(part.body)}${ad('mid')}`;

  if (isBase) {
    return `<article class="article-shell">${breadcrumbs(post, pageNumber, part)}<header class="article-header"><span class="badge ${post.category}">${CATEGORY[post.category].short}</span><h1>${escapeHtml(post.title)}</h1><p class="article-dek">${escapeHtml(headerDescription)}</p><div class="article-meta"><span>작성 ${fmtDate(post.publishedAt)}</span><span>수정 ${fmtDate(post.updatedAt)}</span><span>공식자료 확인 ${fmtDate(post.reviewedAt)}</span><span>${escapeHtml(post.author)}</span></div></header><div class="article-content">${body}<div class="disclaimer">생활비서는 정부기관이 아니며 신청 결과를 보장하지 않습니다. 공식 공고와 담당기관 안내를 최종 기준으로 확인하세요.</div>${actions(post, part, pageNumber, total)}${sources(post, false)}${faqs(post)}</div></article>`;
  }

  return `<article class="article-shell">${breadcrumbs(post, pageNumber, part)}<header class="article-header"><span class="badge ${post.category}">${CATEGORY[post.category].short}</span><h1>${escapeHtml(post.title)}</h1><p class="article-dek">${escapeHtml(headerDescription)}</p><div class="article-meta"><span>작성 ${fmtDate(post.publishedAt)}</span><span>수정 ${fmtDate(post.updatedAt)}</span><span>공식자료 확인 ${fmtDate(post.reviewedAt)}</span><span>${escapeHtml(post.author)}</span></div></header>${body}<div class="disclaimer">생활비서는 정부기관이 아니며 신청 결과를 보장하지 않습니다. 공식 공고와 담당기관 안내를 최종 기준으로 확인하세요.</div>${actions(post, part, pageNumber, total)}${sources(post, pageNumber === total)}${pageNumber === total ? faqs(post) : ''}</div></article>`;
}

function replaceSingleTag(html, pattern, tag) {
  const without = html.replace(new RegExp(pattern.source, 'gi'), '');
  return without.replace('</head>', `${tag}</head>`);
}

function rewriteStructuredData(html, { post, pageNumber, url }) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return full;
    }

    const type = data?.['@type'];
    if (pageNumber > 1 && ['Article', 'FAQPage', 'BreadcrumbList'].includes(type)) return '';

    if (pageNumber === 1 && type === 'Article') {
      data.headline = post.title;
      data.description = post.description;
      data.mainEntityOfPage = url;
      data.image = [post.series.parts[0].image];
      return `<script type="application/ld+json">${safeJson(data)}</script>`;
    }

    return full;
  });
}

function replaceMeta(html, post, part, pageNumber, total) {
  const pathname = pagePath(post, pageNumber);
  const url = canonical(pathname);
  const indexable = pageNumber === 1;
  const title = indexable ? `${post.title} | 생활비서` : `${part.title} | ${post.title} | 생활비서`;
  const description = indexable ? post.description : part.description;
  const imagePart = indexable ? post.series.parts[0] : part;
  const previous = pageNumber > 1 ? `<link rel="prev" href="${canonical(pagePath(post, pageNumber - 1))}">` : '';
  const next = pageNumber < total ? `<link rel="next" href="${canonical(pagePath(post, pageNumber + 1))}">` : '';

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceSingleTag(html, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}">`);
  html = replaceSingleTag(html, /<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,follow,max-image-preview:large,max-snippet:-1'}">`);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, '').replace(/<link\s+rel="(?:prev|next)"[^>]*>/gi, '');
  html = html.replace('</head>', `<link rel="canonical" href="${url}">${previous}${next}</head>`);
  html = replaceSingleTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}">`);
  html = replaceSingleTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = replaceSingleTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);
  html = replaceSingleTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(imagePart.image)}">`);
  html = replaceSingleTag(html, /<meta\s+property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${escapeHtml(imagePart.imageAlt || imagePart.title)}">`);
  html = replaceSingleTag(html, /<meta\s+name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary_large_image">');
  html = replaceSingleTag(html, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(imagePart.image)}">`);
  html = replaceSingleTag(html, /<meta\s+name="twitter:image:alt"[^>]*>/, `<meta name="twitter:image:alt" content="${escapeHtml(imagePart.imageAlt || imagePart.title)}">`);
  html = rewriteStructuredData(html, { post, pageNumber, url });

  if (!html.includes('/series.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/series.css"></head>');
  }
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

for (const post of seriesPosts) {
  const baseFile = path.join(DIST, post.category, post.slug, 'index.html');
  if (!fs.existsSync(baseFile)) throw new Error(`Base article not found: ${baseFile}`);
  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const total = post.series.parts.length;
  post.series.parts.forEach((part, index) => writePage(post, part, index + 1, total, baseHtml));
}

console.log(`Built ${seriesPosts.length} article series with complete indexable base pages, clean noindex continuations, and no visible progress UI.`);
