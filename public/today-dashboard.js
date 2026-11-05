// A small dynamic layer on top of fully rendered indexable HTML.
// No user data is saved, no article body is copied, and API status is explicit.
(function(){
  'use strict';
  const prefix=location.pathname.startsWith('/life/')?'/life/':'/';
  const fmt=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0});
  const pFmt=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
  const localTime=iso=>{
    const date=new Date(iso);
    return Number.isFinite(date.getTime())
      ?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',
        month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date)
      :'시각 미확인';
  };
  const status=(node,message)=>{
    const label=node.querySelector('[data-today-status]');
    if(label)label.textContent=message;
  };
  const create=(tag,cls,txt)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!=null)e.textContent=String(txt);
    return e;
  };
  const external=(url,label,cls)=>{
    const a=create('a',cls,label);
    a.href=url;
    a.target='_blank';a.rel='noopener noreferrer';
    return a;
  };
  const fallback=(box,message,link,url)=>{
    box.replaceChildren(create('p','today-empty',message),external(url,link,'today-official-link'));
  };
  async function get(url){
    const controller=new AbortController();
    const id=setTimeout(()=>controller.abort(),11500);
    try{
      const response=await fetch(prefix+url.replace(/^\//,''),{signal:controller.signal});
      const payload=await response.json();
      if(!response.ok || payload.status!=='ok')throw new Error(payload.message||'응답 오류');
      return payload;
    }finally{clearTimeout(id);}
  }
  function weather(node){
    const selector=node.querySelector('[data-weather-city]');
    const box=node.querySelector('[data-weather-items]');
    if(!box)return;
    let requestId=0;
    const load=async()=>{
      const id=++requestId;
      status(node,'기상청 관측 조회 중');
      try{
        const data=await get('today/api/weather?city='+encodeURIComponent(selector?.value||'seoul'));
        if(id!==requestId)return;
        const temp=create('strong','today-weather-temp',pFmt.format(data.temperatureC)+'°');
        const summary=create('span','today-weather-condition',data.condition||'실황 관측');
        const details=create('p','today-weather-details',
          '습도 '+(data.humidityPercent==null?'—':fmt.format(data.humidityPercent)+'%')
          +' · 1시간 강수 '+(data.precipitationMm==null?'—':data.precipitationMm+'mm'));
        box.replaceChildren(temp,summary,details);
        status(node,'기상청 · 관측 '+data.observationDate+' '+data.observationTime
          +' · 조회 '+localTime(data.retrievedAt));
      }catch(_){
        if(id!==requestId)return;
        fallback(box,'기상청 관측을 불러올 수 없습니다.','기상청 예보 보기',
          'https://www.weather.go.kr/');
        status(node,'기상청 자료 확인 불가 · 자동 갱신 대기');
      }
    };
    selector?.addEventListener('change',load);
    load();
    setInterval(load,45*60000);
  }
  function news(node){
    const box=node.querySelector('[data-news-items]');
    const picker=node.querySelector('[data-news-filter]');
    if(!box)return;
    let all=[];
    const render=()=>{
      const category=picker?.value||'all';
      const selected=all.filter(row=>category==='all'||row.category===category);
      const max=node.dataset.mode==='compact'?5:18;
      const ul=create('ul','today-news-list');
      for(const row of selected.slice(0,max)){
        const li=create('li');
        const anchor=external(row.url,row.title,'today-news-title');
        li.append(anchor,create('span','today-news-meta',
          row.source+' · '+localTime(row.publishedAt)));
        ul.append(li);
      }
      if(!ul.childElementCount){
        box.replaceChildren(create('p','today-empty','해당 분야의 최신 헤드라인이 없습니다.'));
      }else box.replaceChildren(ul);
    };
    const load=async()=>{
      status(node,'뉴스 헤드라인 조회 중');
      try{
        const data=await get('today/api/news');
        all=Array.isArray(data.items)?data.items:[];
        render();
        status(node,'언론사 RSS · '+localTime(data.retrievedAt)
          +(data.partial?' · 일부 소스 지연':''));
      }catch(_){
        fallback(box,'최신 헤드라인을 확인할 수 없습니다.','연합뉴스 원문 보기',
          'https://www.yna.co.kr/');
        status(node,'RSS 수집 불가 · 재시도 예정');
      }
    };
    picker?.addEventListener('change',render);
    load();
    setInterval(load,10*60000);
  }
  function crypto(node){
    const box=node.querySelector('[data-coin-items]');
    if(!box)return;
    const load=async()=>{
      status(node,'원화마켓 시세 조회 중');
      try{
        const data=await get('today/api/crypto');
        const items=(data.items||[]).slice(0,node.dataset.mode==='compact'?4:12);
        const list=create('div','today-coin-list');
        for(const row of items){
          if(!/^KRW-[A-Z0-9]+$/.test(row.market))continue;
          const a=external('https://upbit.com/exchange?code=CRIX.UPBIT.'+row.market,'','today-coin');
          const name=create('span','today-coin-name',row.name);
          name.append(create('small','',row.code));
          a.append(name,create('strong','today-coin-price',
            pFmt.format(row.price)+'원'));
          const change=create('span','today-coin-change',row.changeRate==null
            ?'변동률 미확인'
            :(row.changeRate>=0?'+':'')+(row.changeRate*100).toFixed(2)+'%');
          change.classList.add(row.changeRate>0?'positive':row.changeRate<0?'negative':'neutral');
          a.append(change);
          list.append(a);
        }
        if(!list.childElementCount)throw Error('EMPTY_COINS');
        box.replaceChildren(list);
        status(node,'업비트 KRW · 조회 '+localTime(data.retrievedAt)+' · 전일 종가 대비');
      }catch(_){
        fallback(box,'코인 시세를 확인할 수 없습니다.','업비트 원화마켓 보기',
          'https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC');
        status(node,'시세 조회 불가 · 재시도 예정');
      }
    };
    load();
    setInterval(load,3*60000);
  }
  function stock(node){
    const box=node.querySelector('[data-stock-items]');
    if(!box)return;
    const official='https://data.krx.co.kr/';
    const load=async()=>{
      status(node,'거래소 종가 확인 중');
      try{
        const data=await get('today/api/stocks');
        const result=create('div','today-stock-list');
        for(const row of data.items||[]){
          const a=external(official,'','today-stock');
          a.append(create('span','today-stock-name',row.name),
            create('strong','today-stock-value',pFmt.format(row.close)),
            create('span','today-stock-change',
            row.changePercent==null?'전일대비 미확인'
              :(row.changePercent>=0?'+':'')+pFmt.format(row.changePercent)+'%'));
          result.append(a);
        }
        if(!result.childElementCount)throw Error('STOCKS_EMPTY');
        box.replaceChildren(result);
        status(node,'KRX 영업일 종가 '+data.sourceDate+' · 조회 '+localTime(data.retrievedAt));
      }catch(_){
        fallback(box,'코스피·코스닥 종가는 KRX 원문에서 확인할 수 있습니다.',
          'KRX 공식 지수 보기',official);
        status(node,'시세 재게시 이용권한 또는 최신 자료 확인 전');
      }
    };
    load();
    setInterval(load,6*3600000);
  }
  document.querySelectorAll('[data-today-weather]').forEach(weather);
  document.querySelectorAll('[data-today-news]').forEach(news);
  document.querySelectorAll('[data-today-crypto]').forEach(crypto);
  document.querySelectorAll('[data-today-stocks]').forEach(stock);
}());
