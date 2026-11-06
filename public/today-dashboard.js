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
      :'';
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
  const fallback=(box,link,url,message='현재 데이터를 표시하지 못했습니다. 공식 출처에서 확인하세요.')=>{
    // /today/ must never look like a blank screen when a public API is
    // unconfigured. Other existing embeds keep their compact fallback.
    if(box.closest('.today-viewport')){
      box.hidden=false;
      box.replaceChildren(create('p','today-source-prompt',message),
        external(url,link,'today-official-link'));
      return;
    }
    const header=box.closest('.today-widget')?.querySelector('.today-widget-heading a[href^="https://"]');
    if(header){
      box.replaceChildren();
      box.hidden=true;
    }else{
      box.hidden=false;
      box.replaceChildren(external(url,link,'today-official-link'));
    }
  };
  const attachRefresh=(node,load)=>{
    if(!node.closest('.today-viewport'))return;
    const heading=node.querySelector('.today-widget-heading');
    if(!heading)return;
    const control=create('button','today-refresh','새로고침');
    control.type='button';
    control.setAttribute('aria-label','이 항목 새로고침');
    control.addEventListener('click',load);
    heading.append(control);
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
      status(node,'');
      try{
        const data=await get('today/api/weather?city='+encodeURIComponent(selector?.value||'seoul'));
        if(id!==requestId)return;
        const temp=create('strong','today-weather-temp',pFmt.format(data.temperatureC)+'°');
        const summary=create('span','today-weather-condition',data.condition||'실황 관측');
        const details=create('p','today-weather-details',
          '습도 '+(data.humidityPercent==null?'—':fmt.format(data.humidityPercent)+'%')
          +' · 1시간 강수 '+(data.precipitationMm==null?'—':data.precipitationMm+'mm'));
        box.hidden=false;box.replaceChildren(temp,summary,details);
        status(node,'기상청 · 관측 '+data.observationDate+' '+data.observationTime
          +' · 조회 '+localTime(data.retrievedAt));
      }catch(_){
        if(id!==requestId)return;
        fallback(box,'기상청 날씨 보기','https://www.weather.go.kr/');
        status(node,'');
      }
    };
    selector?.addEventListener('change',load);
    attachRefresh(node,load);
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
      const limit=node.dataset.mode==='compact'?5:4;
      if(!selected.length){
        fallback(box,'주요 뉴스 보기','https://www.yna.co.kr/','선택한 분야의 새 기사가 없습니다.');
        return;
      }
      const ul=create('ul','today-news-list');
      const fill=(count)=>{
        ul.replaceChildren();
        for(const row of selected.slice(0,count)){
          const li=create('li');
          const anchor=external(row.url,row.title,'today-news-title');
          li.append(anchor,create('span','today-news-meta',
            row.source+' · '+localTime(row.publishedAt)));
          ul.append(li);
        }
      };
      fill(limit);
      box.hidden=false;
      box.replaceChildren(ul);
      if(selected.length>limit){
        const more=create('button','today-expand-button','뉴스 더 보기 ('+(selected.length-limit)+'건)');
        more.type='button';
        more.addEventListener('click',()=>{
          fill(selected.length);
          more.remove();
        });
        box.append(more);
      }
    };
    const load=async()=>{
      status(node,'');
      try{
        const data=await get('today/api/news');
        all=Array.isArray(data.items)?data.items:[];
        render();
        status(node,'언론사 · '+localTime(data.retrievedAt));
      }catch(_){
        fallback(box,'주요 뉴스 보기','https://www.yna.co.kr/');
        status(node,'');
      }
    };
    picker?.addEventListener('change',render);
    attachRefresh(node,load);
    load();
    setInterval(load,10*60000);
  }
  function crypto(node){
    const box=node.querySelector('[data-coin-items]');
    if(!box)return;
    const load=async()=>{
      status(node,'');
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
            ?'—'
            :(row.changeRate>=0?'+':'')+(row.changeRate*100).toFixed(2)+'%');
          change.classList.add(row.changeRate>0?'positive':row.changeRate<0?'negative':'neutral');
          a.append(change);
          list.append(a);
        }
        if(!list.childElementCount)throw Error('EMPTY_COINS');
        box.hidden=false;box.replaceChildren(list);
        if(items.length>6 && node.dataset.mode==='full'){
          const rows=[...list.children];
          rows.slice(6).forEach(row=>{row.hidden=true;});
          const more=create('button','today-expand-button','코인 더 보기 ('+(rows.length-6)+'종목)');
          more.type='button';
          more.addEventListener('click',()=>{
            rows.forEach(row=>{row.hidden=false;});
            more.remove();
          });
          box.append(more);
        }
        status(node,'업비트 KRW · 조회 '+localTime(data.retrievedAt)+' · 전일 종가 대비');
      }catch(_){
        fallback(box,'업비트 시세 보기','https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC');
        status(node,'');
      }
    };
    attachRefresh(node,load);
    load();
    setInterval(load,3*60000);
  }
  // Daily reference FX, not live bank quotes: display source date beside values.
  function fx(node){
    const box=node.querySelector('[data-fx-items]');
    if(!box)return;
    const official='https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
    const expected=['USD','JPY','EUR','CNY'];
    const load=async()=>{
      status(node,'');
      try{
        const data=await get('today/api/fx');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(data.sourceDate||'') ||
          !Array.isArray(data.items)||data.items.length!==4)throw Error('FX_MISSING');
        const list=create('div','today-fx-list');
        for(const code of expected){
          const row=data.items.find(item=>item.code===code);
          if(!row||!Number.isFinite(row.krw)||row.krw<=0||
            (row.unit!==1&&row.unit!==100))throw Error('FX_INVALID_'+code);
          const item=create('div','today-fx');
          const name=create('span','today-fx-name',row.name);
          name.append(create('small','',String(row.unit)+' '+row.code));
          item.append(name,create('strong','today-fx-value',pFmt.format(row.krw)+'원'));
          list.append(item);
        }
        box.hidden=false;box.replaceChildren(list);
        status(node,'ECB 참고환율 · '+data.sourceDate+' 기준 · 조회 '+localTime(data.retrievedAt)
          +' · 은행 매매·송금 환율과 다름');
      }catch(_){
        fallback(box,'ECB 기준환율 확인',official,
          '현재 기준환율을 불러오지 못했습니다. 출처에서 확인하세요.');
        status(node,'');
      }
    };
    attachRefresh(node,load);
    load();
    setInterval(load,60*60000);
  }
  function stock(node){
    const box=node.querySelector('[data-stock-items]');
    if(!box)return;
    const official='https://data.krx.co.kr/';
    const load=async()=>{
      status(node,'');
      try{
        const data=await get('today/api/stocks');
        const result=create('div','today-stock-list');
        for(const row of data.items||[]){
          const a=external(official,'','today-stock');
          a.append(create('span','today-stock-name',row.name),
            create('strong','today-stock-value',pFmt.format(row.close)),
            create('span','today-stock-change',
            row.changePercent==null?'—'
              :(row.changePercent>=0?'+':'')+pFmt.format(row.changePercent)+'%'));
          result.append(a);
        }
        if(!result.childElementCount)throw Error('STOCKS_EMPTY');
        box.hidden=false;box.replaceChildren(result);
        status(node,'KRX 영업일 종가 '+data.sourceDate+' · 조회 '+localTime(data.retrievedAt));
      }catch(_){
        fallback(box,'KRX 지수 보기',official);
        status(node,'');
      }
    };
    attachRefresh(node,load);
    load();
    setInterval(load,6*3600000);
  }
  document.querySelectorAll('[data-today-weather]').forEach(weather);
  document.querySelectorAll('[data-today-news]').forEach(news);
  document.querySelectorAll('[data-today-crypto]').forEach(crypto);
  document.querySelectorAll('[data-today-fx]').forEach(fx);
  document.querySelectorAll('[data-today-stocks]').forEach(stock);
}());
