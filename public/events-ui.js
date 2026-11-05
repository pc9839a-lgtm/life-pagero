(() => {
  'use strict';
  const root=document.querySelector('.events-filters');
  if(!root)return;
  const el=selector=>document.querySelector(selector);
  const regions={all:'전국',seoul:'서울',busan:'부산',daegu:'대구',incheon:'인천',
    gwangju:'광주',daejeon:'대전',ulsan:'울산',sejong:'세종',gyeonggi:'경기',
    gangwon:'강원',chungbuk:'충북',chungnam:'충남',jeonbuk:'전북',jeonnam:'전남',
    gyeongbuk:'경북',gyeongnam:'경남',jeju:'제주'};
  const kinds={all:'전체',festival:'축제',concert:'공연·콘서트',
    theater:'뮤지컬·연극',exhibition:'전시·체험',other:'기타 문화행사'};
  const fees={all:'요금 전체',free:'무료',paid:'유료',mixed:'일부 유료',unknown:'요금정보 없음'};
  const allowedPeriod=['today','tomorrow','weekend','this-week','next-week','custom'];
  const params=new URLSearchParams(location.search);
  let state={
    period:allowedPeriod.includes(params.get('period'))?params.get('period'):'this-week',
    region:regions[params.get('region')]?params.get('region'):'all',
    category:kinds[params.get('category')]?params.get('category'):'all',
    fee:fees[params.get('fee')]?params.get('fee'):'all',
    q:(params.get('q')||'').slice(0,80),
    from:params.get('from')||'',to:params.get('to')||''
  };
  let data=[],size=20,meta=null;
  function nowKst(){
    const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const x=key=>p.find(v=>v.type===key)?.value||'';
    return x('year')+'-'+x('month')+'-'+x('day');
  }
  function addDays(iso,days){
    const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);
    return d.toISOString().slice(0,10);
  }
  function dates(){
    const today=nowKst();
    if(state.period==='custom' && /^\d{4}-\d{2}-\d{2}$/.test(state.from)&&
       /^\d{4}-\d{2}-\d{2}$/.test(state.to)&&state.from<=state.to)
      return {from:state.from,to:state.to};
    const day=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
    const monday=addDays(today,-day);
    if(state.period==='today')return {from:today,to:today};
    if(state.period==='tomorrow'){const d=addDays(today,1);return {from:d,to:d};}
    if(state.period==='weekend')return {from:addDays(monday,5),to:addDays(monday,6)};
    if(state.period==='next-week')return {from:addDays(monday,7),to:addDays(monday,13)};
    return {from:monday,to:addDays(monday,6)};
  }
  function append(parent,tag,text,cls){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==null)e.textContent=text;
    parent.appendChild(e);
    return e;
  }
  function makeCard(e){
    const c=document.createElement('article');c.className='events-card';
    const main=append(c,'div',null,'events-card-main');
    const top=append(main,'div',null,'events-card-top');
    append(top,'span',kinds[e.category]||'문화행사','events-type');
    append(top,'span',fees[e.feeType]||'요금정보 없음','events-fee');
    const h=append(main,'h3',null);
    const a=append(h,'a',e.title);
    a.href='/events/'+encodeURIComponent(e.slug)+'/';
    append(main,'p',e.startDate.replaceAll('-','.')+' ~ '+e.endDate.replaceAll('-','.'),'events-date');
    append(main,'p',(regions[e.region]||'지역 확인 필요')+(e.venue?' · '+e.venue:''),'events-place');
    const actions=append(c,'div',null,'events-card-actions');
    const detail=append(actions,'a','행사 정보');
    detail.href=a.href;
    const share=append(actions,'button','공유');
    share.type='button';share.dataset.eventShare=e.slug;share.dataset.title=e.title;
    return c;
  }
  function updateQuery(){
    const query=new URLSearchParams();
    for(const key of ['period','region','category','fee','q']){
      if(state[key] && !({period:'this-week',region:'all',category:'all',fee:'all',q:''}[key]===state[key]))
        query.set(key,state[key]);
    }
    if(state.period==='custom'){if(state.from)query.set('from',state.from);if(state.to)query.set('to',state.to);}
    history.replaceState(null,'',location.pathname+(query.size?'?'+query.toString():''));
  }
  function matches(e,range){
    if(e.startDate>range.to||e.endDate<range.from)return false;
    if(state.region!=='all'&&state.region!==e.region)return false;
    if(state.category!=='all'&&state.category!==e.category)return false;
    if(state.fee!=='all'&&state.fee!==e.feeType)return false;
    if(state.q && !(e.title+' '+(e.venue||'')+' '+(e.address||'')).toLowerCase().includes(state.q.toLowerCase()))return false;
    return true;
  }
  function render(){
    const range=dates(),today=nowKst();
    const found=data.filter(e=>matches(e,range)).sort((a,b)=>{
      const av=a.startDate<=today&&a.endDate>=today?0:1;
      const bv=b.startDate<=today&&b.endDate>=today?0:1;
      return av-bv||(av? a.startDate.localeCompare(b.startDate):0)||
        a.title.localeCompare(b.title,'ko')||a.id.localeCompare(b.id);
    });
    const out=el('[data-event-items]');
    out.replaceChildren();
    for(const e of found.slice(0,size))out.appendChild(makeCard(e));
    if(!found.length){
      const empty=append(out,'div',null,'events-empty');
      append(empty,'h2','조건에 맞는 행사가 없습니다.');
      append(empty,'p',data.length?
        '지역·날짜·종류·요금 필터를 변경해 보세요.':
        '공공데이터에서 확인된 행사가 아직 없습니다. API 인증키 연동 전에는 임의 데이터를 표시하지 않습니다.');
    }
    const rangeLabel=range.from.replaceAll('-','.')+' ~ '+range.to.replaceAll('-','.');
    const stale=meta?.generatedAt && Date.now()-Date.parse(meta.generatedAt)>48*60*60*1000;
    el('[data-summary]').textContent=rangeLabel+' · 확인된 행사 '+found.length+'건'+(stale?' · 정보 갱신 지연':'');
    el('[data-more]').hidden=found.length<=size;
    el('[data-custom-dates]').hidden=state.period!=='custom';
    for(const button of document.querySelectorAll('[data-period]'))
      button.setAttribute('aria-pressed',String(button.dataset.period===state.period));
  }
  async function share(url,title){
    try{
      if(navigator.share){await navigator.share({title,url});return;}
    }catch(error){if(error.name==='AbortError')return;}
    try{
      await navigator.clipboard.writeText(url);
      alert('링크를 복사했습니다.');
    }catch{
      const input=document.createElement('textarea');
      input.value=url;input.style.position='fixed';input.style.left='-9999px';
      document.body.appendChild(input);input.select();
      const copied=document.execCommand('copy');input.remove();
      alert(copied?'링크를 복사했습니다.':'주소창의 링크를 복사해 공유해 주세요.');
    }
  }
  for(const button of document.querySelectorAll('[data-period]')){
    button.addEventListener('click',()=>{
      state.period=button.dataset.period;
      if(state.period==='custom' && (!state.from||!state.to)){
        const range=dates();
        state.from=range.from;state.to=range.to;
        el('[data-from]').value=state.from;el('[data-to]').value=state.to;
      }
      size=20;updateQuery();render();
    });
  }
  for(const [key,selector] of [['region','[data-region]'],['category','[data-category]'],
    ['fee','[data-fee]'],['q','[data-q]'],['from','[data-from]'],['to','[data-to]']]){
    const input=el(selector);
    input.value=state[key];
    input.addEventListener(key==='q'?'input':'change',()=>{
      state[key]=input.value;size=20;updateQuery();render();
    });
  }
  el('[data-more]').addEventListener('click',()=>{size+=20;render();});
  el('[data-share-list]').addEventListener('click',()=>share(location.href,'이번 주 축제·행사'));
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-event-share]');
    if(!button)return;
    const url=new URL('/events/'+encodeURIComponent(button.dataset.eventShare)+'/',location.origin);
    share(url.href,button.dataset.title);
  });
  render();
  fetch('/events-data.json',{cache:'no-cache'}).then(r=>{
    if(!r.ok)throw Error('HTTP '+r.status);
    return r.json();
  }).then(json=>{
    meta=json;
    data=Array.isArray(json.events)?json.events.filter(e=>e&&e.slug&&e.startDate&&e.endDate):[];
    render();
  }).catch(()=>{
    el('[data-summary]').textContent='행사 정보를 불러올 수 없습니다. 다시 시도해 주세요.';
  });
})();
