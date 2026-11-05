// Source-driven finance panels. No browser API secrets, no assumed rates or news.
(function () {
  'use strict';
  const prefix = location.pathname.startsWith('/life/') ? '/life/' : '/';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const time = value => {
    const date = new Date(value);
    if(!Number.isFinite(date.getTime())) return '일시 미확인';
    return new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
    }).format(date) + ' KST';
  };
  const products = document.getElementById('finance-products');
  const status = document.getElementById('finance-products-status');
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
  const rate = value => Number.isFinite(value) ? value.toFixed(2) + '%' : '미공시';
  const official = '<a href="https://finlife.fss.or.kr/" target="_blank" rel="noopener noreferrer">금융감독원 금융상품한눈에에서 확인</a>';
  function renderProducts() {
    if(!products || !allProducts.length)return;
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
      products.innerHTML='<p class="finance-empty">선택한 조건의 공시 상품이 없습니다. 기간이나 금융권을 변경해 보세요.</p>';
      return;
    }
    const body=chosen.slice(0,80).map(row=>
      '<tr><td><strong>'+esc(row.bank)+'</strong><span class="finance-product-sub">'+esc(row.joinWay)+'</span></td>'
      +'<td><strong>'+esc(row.product)+'</strong><details class="finance-condition"><summary>우대조건</summary><p>'
      +esc(row.preferential||'세부 우대조건은 금융회사 상품설명서에서 확인해야 합니다.')+'</p></details></td>'
      +'<td>'+row.term+'개월</td><td class="finance-rate">'+rate(row.baseRate)+'</td>'
      +'<td class="finance-rate finance-best">'+rate(row.maxRate)+'</td></tr>'
    ).join('');
    products.innerHTML='<div class="finance-table-scroll"><table class="finance-rate-table">'
      +'<thead><tr><th scope="col">금융회사</th><th scope="col">상품명·우대조건</th>'
      +'<th scope="col">기간</th><th scope="col">기본금리</th><th scope="col">최고금리</th></tr></thead>'
      +'<tbody>'+body+'</tbody></table></div>';
  }
  async function loadProducts(){
    if(!products)return;
    if(status)status.textContent='금융감독원 공시 자료를 조회하는 중입니다.';
    if(criteria)criteria.textContent='';
    products.innerHTML='<p class="finance-empty">상품 자료 조회 중…</p>';
    const kind=fields.kind.value, group=fields.group.value;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(prefix+'finance/api/products?kind='+encodeURIComponent(kind)
        +'&group='+encodeURIComponent(group),{signal:controller.signal});
      const data=await response.json();
      if(!response.ok||data.status!=='ok')throw new Error(data.message||'공시 자료 연결 실패');
      allProducts=Array.isArray(data.products)?data.products:[];
      if(source)source.textContent='금융감독원 금융상품한눈에 · 조회 '+time(data.retrievedAt)
        +' · 공시 회차는 상품별로 다를 수 있습니다.';
      if(status)status.textContent='공시 상품을 불러왔습니다. 최고금리는 우대조건 충족 시 적용될 수 있습니다.'
        +(data.mayBeTruncated?' 일부 페이지는 조회 한도로 제외되었습니다.':'');
      renderProducts();
    }catch(error){
      allProducts=[];
      const message=error?.name==='AbortError'?'조회 시간이 초과됐습니다.':String(error.message||'조회 실패');
      if(status)status.textContent='실시간 공시 데이터 사용 불가: '+message;
      if(source)source.textContent='최신 공시 미확인 · 실제 금리는 해당 금융회사에서 다시 확인해야 합니다.';
      products.innerHTML='<div class="finance-source-empty"><p>현재 은행별 금리를 확인할 수 없습니다. 확인되지 않은 금리를 표시하지 않습니다.</p>'
        +official+'</div>';
    }finally{clearTimeout(timeout);}
  }
  if(products){
    fields.kind?.addEventListener('change',loadProducts);
    fields.group?.addEventListener('change',loadProducts);
    fields.term?.addEventListener('change',renderProducts);
    fields.sort?.addEventListener('change',renderProducts);
    fields.query?.addEventListener('input',renderProducts);
    loadProducts();
  }

  const issuesEl=document.getElementById('finance-issues');
  const issuesState=document.getElementById('finance-issues-status');
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
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),13000);
    fetch(prefix+'finance/api/issues',{signal:controller.signal}).then(async response=>{
      const data=await response.json();
      if(!response.ok||data.status!=='ok')throw new Error(data.message||'공식 발표 수집 실패');
      allIssues=data.items||[];
      if(issuesState)issuesState.textContent='공식 RSS 확인 '+time(data.retrievedAt)
        +(data.partial?' · 일부 기관 수집 지연':'')
        +' · 기사 전체가 아닌 발표·공시 제목입니다.';
      showIssues();
    }).catch(()=>{
      if(issuesState)issuesState.textContent='최근 공식 발표를 확인할 수 없습니다.';
      issuesEl.innerHTML='<p class="finance-empty">현재 자동 수집을 사용할 수 없습니다. '
        +'<a href="https://dart.fss.or.kr/" target="_blank" rel="noopener noreferrer">DART 공시 확인</a>'
        +' · <a href="https://www.bok.or.kr/" target="_blank" rel="noopener noreferrer">한국은행 발표 확인</a></p>';
    }).finally(()=>clearTimeout(timeout));
  }
}());
