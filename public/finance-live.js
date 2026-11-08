// Source-driven finance panels. No browser API secrets, no assumed rates or news.
(function () {
  'use strict';
  const prefix = location.pathname.startsWith('/life/') ? '/life/' : '/';
  const whenVisible=(node,load)=>{
    if(!node)return;
    let seen=false,started=false,observer=null;
    const attempt=()=>{
      if(started||!seen||document.visibilityState==='hidden')return;
      started=true;
      observer?.disconnect();
      document.removeEventListener?.('visibilitychange',attempt);
      load();
    };
    document.addEventListener?.('visibilitychange',attempt);
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){seen=true;attempt();}
      },{rootMargin:'0px',threshold:0});
      observer.observe(node);
    }else{
      seen=true;
      attempt();
    }
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const time = value => {
    const date = new Date(value);
    if(!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
    }).format(date) + ' KST';
  };
  const preview = document.getElementById('finance-rate-preview');
  const products = document.getElementById('finance-products');
  const ratePanel = document.getElementById('finance-rate-panel');
  const rateOfficial = document.getElementById('finance-rates-official');
  const criteria = document.getElementById('finance-product-criteria');
  const source = document.getElementById('finance-products-source');
  let allProducts = [];
  const fields = {
    kind: document.getElementById('finance-kind'),
    group: document.getElementById('finance-group'),
    term: document.getElementById('finance-term'),
    sort: document.getElementById('finance-sort'),
    query: document.getElementById('finance-query')
  };
  const rate = value => Number.isFinite(value) ? value.toFixed(2) + '%' : '—';
  // PC keeps the full sortable comparison table. Mobile uses a native card
  // list with large rate values, no horizontal scrolling and 12-at-a-time paging.
  let mobileLimit=12;
  const rateTableRow = row =>
    '<tr><td><strong>'+esc(row.bank)+'</strong><span class="finance-product-sub">'+esc(row.joinWay)+'</span></td>'
    +'<td><strong>'+esc(row.product)+'</strong>'
    +(row.preferential
      ? '<details class="finance-condition"><summary>우대조건</summary><p>'+esc(row.preferential)+'</p></details>'
      : '')+'</td>'
    +'<td>'+esc(row.term)+'개월</td><td class="finance-rate">'+rate(row.baseRate)+'</td>'
    +'<td class="finance-rate finance-best">'+rate(row.maxRate)+'</td></tr>';
  const rateMobileCard = row =>
    '<article class="finance-mobile-rate-card">'
    +'<div class="finance-mobile-rate-bank"><strong>'+esc(row.bank)+'</strong>'
    +'<span>'+esc(row.term)+'개월</span></div>'
    +'<h3 class="finance-mobile-rate-product">'+esc(row.product)+'</h3>'
    +'<div class="finance-mobile-rate-values">'
    +'<div class="finance-mobile-rate-value"><span>기본금리</span><strong>'+rate(row.baseRate)+'</strong></div>'
    +'<div class="finance-mobile-rate-value finance-mobile-rate-best"><span>최고금리</span><strong>'+rate(row.maxRate)+'</strong></div>'
    +'</div>'
    +(row.preferential
      ? '<details class="finance-mobile-rate-details"><summary>우대조건 보기</summary><p>'+esc(row.preferential)+'</p></details>'
      : '')
    +'</article>';
  function renderProducts(resetMobile=true) {
    if(!products || !allProducts.length)return;
    if(resetMobile)mobileLimit=12;
    const t=fields.term.value;
    const filter=String(fields.query.value||'').toLowerCase().trim();
    const chosen=allProducts.filter(row=>(t==='all'||String(row.term)===t)
      &&(!filter || (row.bank+' '+row.product).toLowerCase().includes(filter)));
    const sortBy=fields.sort.value;
    chosen.sort((a,b)=>{
      const x=sortBy==='base'?a.baseRate:a.maxRate;
      const y=sortBy==='base'?b.baseRate:b.maxRate;
      return (y??-1)-(x??-1) || (b.baseRate??-1)-(a.baseRate??-1)
        || a.bank.localeCompare(b.bank,'ko');
    });
    if(criteria)criteria.textContent='조건에 맞는 공시 상품 '+chosen.length+'건'
      +(chosen.length>80?' · 상위 80건 표시':'');
    if(!chosen.length){
      products.innerHTML='<p class="finance-empty">검색 결과가 없습니다. 조건을 변경해 보세요.</p>';
      return;
    }
    const displayed=chosen.slice(0,80);
    const table=displayed.map(rateTableRow).join('');
    const cards=displayed.slice(0,mobileLimit).map(rateMobileCard).join('');
    const remaining=Math.max(0,displayed.length-mobileLimit);
    products.innerHTML=
      '<div class="finance-desktop-rates finance-table-scroll"><table class="finance-rate-table">'
      +'<thead><tr><th scope="col">금융회사</th><th scope="col">상품명·우대조건</th>'
      +'<th scope="col">기간</th><th scope="col">기본금리</th><th scope="col">최고금리</th></tr></thead>'
      +'<tbody>'+table+'</tbody></table></div>'
      +'<div class="finance-mobile-rates" aria-label="금리 비교 결과">'
      +'<div class="finance-mobile-rates-list">'+cards+'</div>'
      +(remaining
        ? '<button class="finance-mobile-rates-more" type="button">더 보기 ('+remaining+'건 남음)</button>'
        : '')+'</div>';
    const more=products.querySelector('.finance-mobile-rates-more');
    if(more)more.addEventListener('click',()=>{mobileLimit+=12;renderProducts(false);});
  }
  // Cache only FSS public results in this page's memory; no KV/D1 or
  // persistent browser storage. Users switching back to a category do not
  // pay another Functions request.
  const productsMemo=new Map();
  const productFlights=new Map();
  let selectedRequest=0;
  function fetchProducts(kind,group){
    const key=kind+'|'+group;
    if(productsMemo.has(key))return Promise.resolve(productsMemo.get(key));
    if(productFlights.has(key))return productFlights.get(key);
    const pending=(async()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),18000);
      try{
        const response=await fetch(prefix+'finance/api/products?kind='+encodeURIComponent(kind)
          +'&group='+encodeURIComponent(group),{signal:controller.signal});
        const data=await response.json();
        if(!response.ok||data.status!=='ok'||!Array.isArray(data.products)
          ||!data.products.length)throw Error('Finance feed unavailable');
        productsMemo.set(key,data);
        return data;
      }finally{clearTimeout(timeout);}
    })();
    productFlights.set(key,pending);
    pending.finally(()=>{if(productFlights.get(key)===pending)productFlights.delete(key);})
      .catch(()=>{});
    return pending;
  }
  async function loadProducts(){
    if(!products)return;
    const id=++selectedRequest;
    const kind=fields.kind.value,group=fields.group.value;
    if(criteria)criteria.textContent='';
    // Keep already verified rates visible until a new selection resolves.
    try{
      const data=await fetchProducts(kind,group);
      if(id!==selectedRequest)return;
      allProducts=data.products;
      if(source)source.textContent='금융감독원 · '+time(data.retrievedAt);
      renderProducts();
      if(ratePanel)ratePanel.hidden=false;
      if(rateOfficial)rateOfficial.hidden=true;
    }catch(error){
      if(id!==selectedRequest)return;
      allProducts=[];
      if(ratePanel)ratePanel.hidden=true;
      if(rateOfficial)rateOfficial.hidden=false;
      if(source)source.textContent='';
      products.replaceChildren();
    }
  }
  if(products){
    fields.kind?.addEventListener('change',loadProducts);
    fields.group?.addEventListener('change',loadProducts);
    fields.term?.addEventListener('change',renderProducts);
    fields.sort?.addEventListener('change',renderProducts);
    fields.query?.addEventListener('input',renderProducts);
    const embedded=document.getElementById('finance-initial-products');
    if(embedded){
      try{
        const initial=JSON.parse(embedded.textContent);
        if(!Array.isArray(initial.products)||!initial.products.length)throw new Error('empty');
        allProducts=initial.products;
        productsMemo.set('deposit|bank',initial);
        renderProducts();
        if(source)source.textContent='금융감독원 · '+time(initial.retrievedAt);
        if(ratePanel)ratePanel.hidden=false;
        if(rateOfficial)rateOfficial.hidden=true;
      }catch(error){whenVisible(rateOfficial||ratePanel,loadProducts);}
    }else{whenVisible(rateOfficial||ratePanel,loadProducts);}
  }

  async function loadRatePreview(){
    if(!preview)return;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch(prefix+'finance/api/products?kind=deposit&group=bank',
        {signal:controller.signal});
      const data=await response.json();
      if(!response.ok||data.status!=='ok'||!Array.isArray(data.products)||!data.products.length)
        throw new Error('No verified bank products');
      const twelve=data.products.filter(item=>item.term===12&&Number.isFinite(item.baseRate));
      const ranked=(twelve.length?twelve:data.products.filter(item=>Number.isFinite(item.baseRate)))
        .sort((a,b)=>(b.baseRate??-1)-(a.baseRate??-1))
        .slice(0,3);
      if(!ranked.length)throw new Error('No published base rates');
      preview.innerHTML='<div class="finance-preview-grid">'+ranked.map(item=>
        '<a class="finance-preview-card" href="'+prefix+'finance/savings/">'+
        '<span class="finance-preview-bank">'+esc(item.bank)+'</span>'+
        '<strong class="finance-preview-rate">'+rate(item.baseRate)+'</strong>'+
        '<span class="finance-preview-product">'+esc(item.product)+'</span>'+
        '<span class="finance-preview-term">'+item.term+'개월 · 기본금리</span></a>').join('')+
        '</div><a class="finance-preview-more" href="'+prefix+'finance/savings/">'+
        '은행별 예금·적금 전체 비교 ›</a>';
      preview.hidden=false;
      if(rateOfficial)rateOfficial.hidden=true;
    }catch(error){
      preview.hidden=true;
      if(rateOfficial)rateOfficial.hidden=false;
      console.warn('[finance] Could not load verified preview:',error?.name||'unavailable');
    }finally {clearTimeout(timeout);}
  }
  if(preview && preview.dataset.preloaded!=='true')
    whenVisible(rateOfficial||preview,loadRatePreview);

  const issuesEl=document.getElementById('finance-issues');
  const issuePanel=document.getElementById('finance-issues-panel');
  const issueOfficial=document.getElementById('finance-issues-official');
  const issuesType=document.getElementById('finance-issues-type');
  let allIssues=[];
  const issueLink=entry => '<li><a href="'+esc(entry.url)
    +'" target="_blank" rel="noopener noreferrer"><strong>'+esc(entry.title)
    +'</strong><span>'+esc(entry.source)+' · '+esc(entry.type)
    +' · '+esc(time(entry.publishedAt))+'</span></a></li>';
  function showIssues(){
    if(!issuesEl)return;
    const chosen=issuesType?.value||'all';
    const rows=allIssues.filter(x=>chosen==='all'
      || (chosen==='stock'&&x.type==='주식 공시')
      || (chosen==='policy'&&x.type!=='주식 공시'));
    issuesEl.innerHTML=rows.length?'<ul class="finance-issue-list">'
      +rows.slice(0,24).map(issueLink).join('')+'</ul>'
      :'<p class="finance-empty">선택한 분류의 최근 공식 발표가 없습니다.</p>';
  }
  if(issuesEl){
    issuesType?.addEventListener('change',showIssues);
    // Official links stay visible until the user reaches this section.
    whenVisible(issueOfficial||issuesEl,()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),13000);
      fetch(prefix+'finance/api/issues',{signal:controller.signal}).then(async response=>{
        const data=await response.json();
        if(!response.ok||data.status!=='ok')throw Error('Official updates unavailable');
        allIssues=Array.isArray(data.items)?data.items:[];
        if(!allIssues.length)throw Error('No verified updates');
        showIssues();
        if(issuePanel)issuePanel.hidden=false;
        if(issueOfficial)issueOfficial.hidden=true;
      }).catch(()=>{
        if(issuePanel)issuePanel.hidden=true;
        if(issueOfficial)issueOfficial.hidden=false;
        issuesEl.replaceChildren();
      }).finally(()=>clearTimeout(timeout));
    });
  }
}());
