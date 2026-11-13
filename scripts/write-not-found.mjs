import fs from 'node:fs';
import path from 'node:path';

// Cloudflare Pages serves /index.html (200) for unknown paths when there is
// no top-level 404.html. LIFE is a generated multi-page content site, not a SPA.
// Write this after the content/asset validation passes so QA keeps inspecting
// the same existing article and utility pages.
const dist = path.resolve('dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('[404] LIFE build output is missing.');
}
const target = path.join(dist, '404.html');
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>페이지를 찾을 수 없습니다 | 생활비서</title>
<meta name="description" content="요청하신 생활비서 페이지가 없거나 주소가 변경되었습니다.">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f8fafc}
main{width:min(480px,calc(100% - 40px));padding:40px 28px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;text-align:center}
small{color:#64748b;font-weight:700}h1{font-size:27px;letter-spacing:-.04em;margin:12px 0}p{color:#475569;line-height:1.7;margin:0 0 24px}a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;color:#fff;background:#e95731;border-radius:9px;text-decoration:none;font-weight:700}
</style>
</head>
<body><main><small>생활비서 · 페이지 오류</small><h1>페이지를 찾을 수 없습니다.</h1><p>주소가 변경되었거나 게시가 종료된 콘텐츠입니다. 필요한 정보는 생활비서에서 다시 찾아보세요.</p><a href="/life/">생활비서 홈으로</a></main></body>
</html>`;
if (/<script\\b|google-adsense-account|adsbygoogle/i.test(html)) {
  throw new Error('[404] A missing page must never load ads.');
}
fs.writeFileSync(target, html, 'utf8');
const result = fs.readFileSync(target, 'utf8');
if (!result.includes('name="robots" content="noindex,nofollow"')
    || !result.includes('href="/life/"') || !result.includes('<h1>')) {
  throw new Error('[404] Missing noindex, recovery link or H1.');
}
console.log('[404] Created noindex static 404.html. Unknown LIFE routes will no longer fall back to homepage with HTTP 200.');
