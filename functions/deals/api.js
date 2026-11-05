// ADPICK for BIZ API. Product data is used only to render the current request.
// Do not store/cache/rewrite returned product data without the provider's permission.
const PROVIDER="https://biz.adpick.co.kr/api";
const BEST_AREAS=new Set(["today","popular","pick","commission"]);
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff",
  "X-Robots-Tag":"noindex"
}});
const safeLink=value=>{
  try{const url=new URL(String(value||""));return url.protocol==="https:"?url.href:null;}
  catch{return null;}
};
export async function onRequestGet({request,env}){
  const key=String(env?.ADPICK_BIZ_API_KEY||"").trim();
  if(!key)return reply({status:"unconfigured",items:[]},503);
  const params=new URL(request.url).searchParams;
  const mode=params.get("mode")==="search"?"search":"best";
  const endpoint=new URL(PROVIDER+"/"+encodeURIComponent(key)+"/"+mode);
  endpoint.searchParams.set("limit","10");
  if(mode==="best"){
    const area=params.get("area")||"today";
    if(!BEST_AREAS.has(area))return reply({status:"invalid_request",items:[]},400);
    endpoint.searchParams.set("area",area);
    endpoint.searchParams.set("p_data","life_deals_"+area);
  } else {
    const q=String(params.get("q")||"").trim();
    if(q.length<2||q.length>40)return reply({status:"invalid_query",items:[]},400);
    endpoint.searchParams.set("q",q);
    endpoint.searchParams.set("p_data","life_deals_search");
  }
  try{
    const response=await fetch(endpoint.href,{
      headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw new Error("UPSTREAM_"+response.status);
    const data=await response.json();
    if(data?.success!==true)throw new Error("API_REJECTED");
    const source=mode==="best"?data.data?.list:data.data;
    if(!Array.isArray(source))throw new Error("MALFORMED_RESPONSE");
    // Keep product name, price, image, shop and affiliate URL unmodified.
    // Drop entries without a safe commission link rather than fabricate URLs.
    const items=source.slice(0,10).filter(row=>row&&typeof row==="object")
      .filter(row=>safeLink(row.commissionlink)&&typeof row.title==="string")
      .map(row=>({
        title:row.title,price:row.price??null,
        photo:safeLink(row.photo),cp_name:row.cp_name??"",
        commissionlink:safeLink(row.commissionlink)
      }));
    return reply({status:"ok",mode,area:mode==="best"?params.get("area")||"today":null,items});
  }catch(error){
    // Do not log URL or credentials.
    console.error("[adpick-biz] request failed",error instanceof Error?error.message:"unknown");
    return reply({status:"unavailable",items:[]},502);
  }
}