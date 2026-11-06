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
// A keyword hit is not enough to recommend an ingredient: "가리비" also
// matches fishing lures and restaurant vouchers. Only recognize purchasable,
// uncooked food for the two editorial articles. Fail closed if uncertain.
// This filters the provider response at request time, never persists it.
const NO_INGREDIENT=/(투어|tour|e[ -]?bike|e[ -]?바이크|자전거|사이클|사파리|입장료|기념품|낚시|미끼|루어|에기|채비|피싱|낚싯|오징어미끼|낚시바늘|가라비|호텔|리조트|숙박|펜션|좌석|예약|입장권|체험|이용권|티켓|관광|여행|레스토랑|식당|횟집|뷔페|맛집|코스요리|세트메뉴|화로구이|뷔페|오마카세|쿠션|파운데이션|화장품|마스크팩|립스틱|스킨케어|크림|아이라이너|마사지|귀걸이|목걸이|키링|인형|스티커|완구|장난감|의류|티셔츠|가방|케이스|패턴|장식|모양|모형|공예|껍데기|패각|접시|그릇|식기|찜기|냄비|조리도구|프라이팬|보관용기|농약|비료|모종|씨앗|화분|재배키트|책|도서|그림|포스터|분말|가루|라떼|빵|쿠키|과자|스낵|칩|젤리|말랭이|맛사탕|캔디|케이크|퓨레|시럽|잼|스프|컵라면|라면|간식|사료|영양제|추출물|캡슐|즙|아이스크림|만두|볶음밥|비빔밥|도시락|밀키트|조리완료|완제품)/i;
// Weight alone does not prove food relevance, but raw ingredient weights help.
const FRESH_UNIT=/\d+(?:[.,]\d+)?\s*(?:kg|g|킬로|키로|그램|마리)(?![a-z])/i;
const PROCESSED_OR_TOOLS=/(ebook|e-book|e북|e-북|전자책|전자도서|도서|책자|서적|도감|소설|기프트|모바일상품권|기프티콘|이유식|유아식|아기간식|아기밥|어린이용|키즈|키조개|조개전용|전용칼|손질칼|칼집|나이프|커터|커팅기|주방칼|칼날|칼세트|커터기|도마|식칼|조리도구|이쑤시개|용품|국자|집게|기프트카드|상품권|선물권|포장권|콘서트|어묵|조미|양념|맛살|통조림|가공품|가공식품|유아용|레토르트)/i;
const SCALLOP_FRESH=/(생물|활가리비|생가리비|홍가리비|비단가리비|수산물|수산|해산물|산지직송|산지|원물|국내산|자연산|양식|손질|냉장|냉동|급냉|반각|관자|조개|신선)/i;
const POTATO_FRESH=/(생고구마|햇고구마|꿀고구마|밤고구마|호박고구마|자색고구마|세척고구마|흙고구마|베니하루카|산지직송|산지|농산물|국내산|못난이|무세척|갓수확|농장|신선|수확)/i;
const SAMCHI_FRESH=/(생삼치|손질삼치|냉동삼치|선동삼치|삼치필렛|삼치살|산지직송|수산물|국내산|냉장|냉동|원물|생물|손질|구이용|순살|토막)/i;
const RADISH_FRESH=/(가을무|김장무|월동무|조선무|국산무|국산 무|햇무|산지직송|국내산|농산물|산지|재배|수확|못난이|무세척|흙무|통무)/i;
const RADISH_ITEM=/(?:가을무|김장무|월동무|조선무|국산무|국산 무|햇무|흙무|통무|무우|(?:^|[\s\[(])무(?=$|[\s\])\d]))/i;
const NO_PROCESSED_SAMCHI=/(삼치구이(?!용)|삼치조림|삼치회|삼치튀김|삼치덮밥|훈제삼치|구운삼치|양념삼치)/i;
const NO_PROCESSED_RADISH=/(무김치|무생채|깍두기|동치미|단무지|무절임|무피클|무채볶음|무국|무말랭이|무조림|시래기)/i;
const OYSTER_FRESH=/(생굴|깐굴|봉지굴|굴살|통영굴|석화|산지직송|수산물|국내산|냉장|냉동|원물|생물|손질|자연산|양식)/i;
const NO_PREPARED_OYSTER=/(굴전|굴국|굴밥|굴죽|굴찜|굴튀김|굴라면|굴보쌈|굴소스|굴젓|굴무침|굴김치|훈제굴|구운굴|굴장|굴비)/i;
const PERSIMMON_FRESH=/(단감|부유단감|태추단감|국내산|산지직송|생과|생과일|농산물|제철|햇과일|수확|과수원|신선)/i;
const PERSIMMON_COUNT=/\d+\s*(?:개|과|입|팩|박스)/i;
const NO_PREPARED_PERSIMMON=/(곶감|반건시|홍시|단감\s*말랭이|말린\s*단감|감\s*식초|감\s*잼|단감\s*청|단감\s*주스|단감\s*착즙|단감\s*칩|단감\s*샐러드|단감\s*퓨레)/i;
export function isRelevantFoodProduct(topic,title){
  if(typeof title!=="string"||!title.trim())return false;
  const text=title.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
  if(NO_INGREDIENT.test(text)||PROCESSED_OR_TOOLS.test(text))return false;
  if(topic==="가리비")
    return /가리비/.test(text)&&(FRESH_UNIT.test(text)||SCALLOP_FRESH.test(text));
  if(topic==="고구마")
    return /고구마/.test(text)&&(FRESH_UNIT.test(text)||POTATO_FRESH.test(text));
  if(topic==="삼치")
    return /삼치/.test(text)&&!NO_PROCESSED_SAMCHI.test(text)
      &&(FRESH_UNIT.test(text)||SAMCHI_FRESH.test(text));
  if(topic==="무")
    return RADISH_ITEM.test(text)&&!NO_PROCESSED_RADISH.test(text)
      &&(FRESH_UNIT.test(text)||RADISH_FRESH.test(text));
  if(topic==="굴")
    return /굴(?!비)|석화/.test(text)&&!NO_PREPARED_OYSTER.test(text)
      &&(FRESH_UNIT.test(text)||OYSTER_FRESH.test(text));
  if(topic==="단감")
    return /단감/.test(text)&&!NO_PREPARED_PERSIMMON.test(text)
      &&(FRESH_UNIT.test(text)||PERSIMMON_COUNT.test(text)||PERSIMMON_FRESH.test(text));
  return false;
}
const FOOD_TOPIC=Object.freeze({"가리비":"가리비","홍가리비":"가리비","고구마":"고구마","꿀고구마":"고구마","삼치":"삼치","손질삼치":"삼치","가을무":"무","국산 무":"무","생굴":"굴","굴":"굴","단감":"단감"});
export async function onRequestGet({request,env}){
  const key=String(env?.ADPICK_BIZ_API_KEY||"").trim();
  if(!key)return reply({status:"unconfigured",items:[]},503);
  const params=new URL(request.url).searchParams;
  const mode=params.get("mode")==="search"?"search":"best";
  const rawQuery=String(params.get("q")||"").trim();
  if(mode==="search"&&(rawQuery.length<2||rawQuery.length>40))
    return reply({status:"invalid_query",items:[]},400);
  const isFoodSearch=mode==="search"&&params.get("src")==="food";
  const foodTopic=isFoodSearch&&Object.hasOwn(FOOD_TOPIC,rawQuery)?FOOD_TOPIC[rawQuery]:null;
  const area=params.get("area")||"today";
  if(mode==="best"&&!BEST_AREAS.has(area))
    return reply({status:"invalid_request",items:[]},400);
  const fetchProducts=async term=>{
    const endpoint=new URL(PROVIDER+"/"+encodeURIComponent(key)+"/"+mode);
    endpoint.searchParams.set("limit",foodTopic?"20":"10");
    if(mode==="best"){
      endpoint.searchParams.set("area",area);
      endpoint.searchParams.set("p_data","life_deals_"+area);
    }else{
      endpoint.searchParams.set("q",term);
      endpoint.searchParams.set("p_data",isFoodSearch?"life_food_search":"life_deals_search");
    }
    const response=await fetch(endpoint.href,{
      headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(foodTopic?4000:8000)
    });
    if(!response.ok)throw new Error("UPSTREAM_"+response.status);
    const data=await response.json();
    if(data?.success!==true)throw new Error("API_REJECTED");
    const source=mode==="best"?data.data?.list:data.data;
    if(!Array.isArray(source))throw new Error("MALFORMED_RESPONSE");
    // Preserve provider names, prices, images and affiliate links unchanged.
    // Only reject invalid HTTPS links and mismatched ingredient results.
    return source.slice(0,foodTopic?20:10).filter(row=>row&&typeof row==="object")
      .filter(row=>safeLink(row.commissionlink)&&typeof row.title==="string")
      .filter(row=>!foodTopic||isRelevantFoodProduct(foodTopic,row.title))
      .map(row=>({
        title:row.title,price:row.price??null,
        photo:safeLink(row.photo),cp_name:row.cp_name??"",
        commissionlink:safeLink(row.commissionlink)
      }));
  };
  try{
    // The article uses one narrow ingredient query to avoid two sequential
    // upstream requests. An empty result is preferable to slow, irrelevant ads.
    const items=await fetchProducts(rawQuery);
    return reply({status:"ok",mode,area:mode==="best"?area:null,items});
  }catch(error){
    // Do not log URL or credentials.
    console.error("[adpick-biz] request failed",error instanceof Error?error.message:"unknown");
    return reply({status:"unavailable",items:[]},502);
  }
}