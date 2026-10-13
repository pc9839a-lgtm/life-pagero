// Redirect a legacy standalone life site to its single canonical location.
// This handler is host-gated: when the same build is served under pagero.kr,
// it does not affect the canonical pages or assets.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.toLowerCase() !== 'life.pagero.kr') {
    return context.next();
  }
  const target = new URL('https://pagero.kr/life/');
  target.pathname = '/life/' + url.pathname.replace(/^\/+/, '').replace(/^life\/+/, '');
  target.search = url.search;
  return Response.redirect(target.toString(), 301);
}
