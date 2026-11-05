// Cloudflare Pages Functions helper. Cache keys are normalized per endpoint.
// All source requests are fixed endpoints; no user supplied remote URLs.
export function json(body, status = 200, ttl = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=30, s-maxage=' + ttl : 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
export async function cached(context, key, seconds, loader) {
  const store = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const request = new Request('https://life-pagero.pages.dev/today/api/' + key, { method: 'GET' });
  if (store) {
    const hit = await store.match(request);
    if (hit) return hit;
  }
  try {
    const data = await loader();
    const response = json({status:'ok', retrievedAt:new Date().toISOString(), ...data},200,seconds);
    if (store && context.waitUntil) context.waitUntil(store.put(request,response.clone()));
    return response;
  } catch (error) {
    console.warn('today dashboard source failed',key,String(error?.message||error));
    return json({status:'unavailable', source:key, message:'현재 자료를 확인할 수 없습니다.'},502);
  }
}
export function finite(value) {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replaceAll(',',''));
  return Number.isFinite(n) ? n : null;
}
export function text(value, limit = 170) {
  return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,limit);
}
