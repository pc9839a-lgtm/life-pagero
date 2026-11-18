// Classify the response a visitor would actually get from an outbound citation.
// A bot-protection failure is UNKNOWN health, not a verified working page.
const denyStatuses=new Set([401,403,405,408,417,429]);
const securityPath=/(?:\/security\/secure\/security\.html|\/cdn-cgi\/challenge-platform(?:\/|$)|\/(?:captcha|access[-_]denied|security[-_]check)(?:\/|$))/i;
const homePaths=new Set(['/','/index.html','/index.jsp','/main/main.do']);

export function classifyExternalResponse({requestedUrl,responseUrl,status,contentType='',isImage=false}){
  if([404,410].includes(status))
    return {level:'error',cause:'hard-not-found',message:'hard failure HTTP '+status};
  if(status>=500)
    return {level:'warning',cause:'temporary-server-response',message:'temporary server response HTTP '+status};
  if(denyStatuses.has(status))
    return {level:'warning',cause:'access-restricted',message:'destination access restricted HTTP '+status};
  if(status<200||status>=300)
    return {level:'warning',cause:'unexpected-http-response',message:'unexpected HTTP '+status};
  let source,destination;
  try{
    source=new URL(requestedUrl);
    destination=new URL(responseUrl||requestedUrl);
  }catch{
    return {level:'warning',cause:'unexpected-http-response',message:'unparseable final response URL'};
  }
  if(destination.protocol!=='https:')
    return {level:'warning',cause:'insecure-redirect',message:'final URL is not HTTPS: '+destination.href};
  if(securityPath.test(destination.pathname))
    return {level:'warning',cause:'security-interstitial',
      message:'redirected to security/anti-bot gate: '+destination.href};
  const sourceHost=source.hostname.replace(/^www\./,'');
  const finalHost=destination.hostname.replace(/^www\./,'');
  if(sourceHost===finalHost && !homePaths.has(source.pathname)
      && homePaths.has(destination.pathname)
      && source.pathname!==destination.pathname)
    return {level:'warning',cause:'homepage-redirect',
      message:'deep citation redirects to site homepage: '+destination.href};
  if(isImage && contentType && !/^image\//i.test(contentType))
    return {level:'warning',cause:'image-content-type',message:'image URL returned '+contentType};
  return {level:'ok',cause:'http-success',message:'HTTP '+status};
}
