import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const escapeAttr = escapeHtml;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const pagePath = (post, pageNumber) => pageNumber === 1 ? `/${post.category}/${post.slug}/` : `/${post.category}/${post.slug}/${pageNumber}/`;

const ENRICH = {
  'car-inspection-period': [
    {
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=82',
      alt: '자동차 정비소에서 차량을 점검하는 모습',
      extra: `<section class="series-extra"><h2>검사 종류를 잘못 판단하기 쉬운 경우</h2><p>승용차라는 이유만으로 모두 같은 검사 주기가 적용되는 것은 아닙니다. 사업용 여부, 최초등록일, 사용 본거지, 차량 구조와 용도에 따라 적용 조건이 달라질 수 있습니다. 특히 명의이전이나 주소 변경 직후에는 예전에 받았던 안내와 현재 전산 정보가 다를 수 있으므로 자동차등록증의 최신 내용을 기준으로 확인해야 합니다.</p><h2>조회 전에 메모해 둘 항목</h2><ul><li>자동차등록번호와 소유자 확인 정보</li><li>차종·용도·최초등록일</li><li>최근 명의이전 또는 주소 변경 여부</li><li>현재 알고 있는 검사 만료일</li></ul><p>이 네 가지를 준비해 두면 공식 조회 화면에서 오류가 발생했을 때 어떤 정보가 맞지 않는지 빠르게 확인할 수 있습니다.</p></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1400&q=82',
      alt: '차량 점검 정보를 확인하며 작업하는 자동차 정비사',
      extra: `<section class="series-extra"><h2>조회 결과를 저장하는 방법</h2><p>검사 종류와 만료일만 눈으로 보고 닫지 말고 조회 결과를 캡처하거나 달력에 등록하세요. 만료일과 함께 예약 준비일을 별도로 만들어 두면 검사소 예약이 몰리거나 차량 수리가 필요할 때도 여유를 확보할 수 있습니다. 가족 차량이나 회사 차량이라면 담당자와 결과를 공유해 중복 예약과 일정 누락을 막는 것이 좋습니다.</p><h2>정보가 일치하지 않을 때</h2><p>명의이전 직후, 공동명의, 법인 차량, 번호판 변경 이력이 있는 차량은 소유자 확인 정보가 바로 일치하지 않을 수 있습니다. 여러 민간 사이트를 옮겨 다니기보다 최신 자동차등록증을 기준으로 다시 입력하고, 계속 조회되지 않으면 사이버검사소 또는 관할 등록관청에 확인해야 합니다.</p></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1400&q=82',
      alt: '차량 검사와 정비를 준비하는 자동차 정비 현장',
      extra: `<section class="series-extra"><h2>검사일을 정할 때 여유가 필요한 이유</h2><p>검사 만료일 직전에 예약하면 차량 결함으로 부적합 판정을 받았을 때 수리와 재검을 마칠 시간이 부족할 수 있습니다. 검사 가능 기간의 초반이나 중간에 예약하면 일정 변경, 부품 수급, 재검에 대응하기 쉽습니다. 주말과 월말은 예약이 빠르게 마감될 수 있으므로 평일 시간도 함께 살펴보세요.</p><h2>중고차 구입 직후 확인사항</h2><p>중고차를 구입했다고 해서 구입일부터 새로운 검사 주기가 시작되는 것은 아닙니다. 이전등록을 마친 직후 공식 조회 결과에서 기존 유효기간이 어떻게 이어지는지 확인하고, 판매자가 제시한 검사 결과표와 현재 전산 상태가 일치하는지도 점검해야 합니다.</p></section>`
    }
  ],
  'car-inspection-reservation': [
    {
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=82',
      alt: '검사를 위해 정비소에 들어온 자동차',
      extra: `<section class="series-extra"><h2>검사소를 거리만 보고 고르면 안 되는 이유</h2><p>검사소마다 처리할 수 있는 차종과 검사 종류가 다를 수 있습니다. 대형차, 구조변경 차량, 특수차량은 전용 시설이 필요할 수 있고, 민간검사소는 예약 방식과 운영시간이 공단 검사소와 다를 수 있습니다. 예약 전에 검사 가능 차종, 운영시간, 차량 높이·중량 제한을 확인해야 현장 재방문을 줄일 수 있습니다.</p><h2>예약 전에 준비하면 좋은 정보</h2><ul><li>차량번호와 소유자 확인 정보</li><li>검사 종류와 유효기간</li><li>방문 가능한 날짜와 지역</li><li>연락처와 결제수단</li></ul></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=82',
      alt: '검사 예약 후 도로를 이동하는 자동차',
      extra: `<section class="series-extra"><h2>예약 완료 화면에서 확인할 내용</h2><p>결제가 끝났다면 예약번호, 검사소 이름과 주소, 방문 날짜와 시간, 검사 종류, 결제 금액을 다시 확인하세요. 비슷한 이름의 검사소가 여러 곳일 수 있으므로 내비게이션에는 예약 화면에 표시된 정확한 주소를 입력해야 합니다. 예약 문자는 삭제하지 말고 검사 완료 전까지 보관하는 것이 좋습니다.</p><h2>일정을 변경해야 한다면</h2><p>검사소와 결제 방식에 따라 변경·취소 가능 시점과 환불 방법이 달라질 수 있습니다. 임의로 방문하지 않는 것보다 예약 화면에서 변경 또는 취소 처리를 완료하고 새 일정을 확보해야 합니다. 만료일이 임박했다면 취소 후 새 예약이 가능한지 먼저 확인하세요.</p></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=82',
      alt: '차량 검사 전 자동차 상태를 확인하는 모습',
      extra: `<section class="series-extra"><h2>방문 전 직접 확인할 수 있는 항목</h2><p>전조등, 방향지시등, 제동등, 타이어 손상, 번호판 훼손, 계기판 경고등, 와이퍼와 워셔액은 운전자가 미리 확인하기 쉬운 부분입니다. 눈에 띄는 이상이 있다면 검사 당일 발견하기보다 미리 정비해 부적합과 재방문 가능성을 낮추는 편이 좋습니다.</p><h2>부적합 판정을 받은 뒤</h2><p>결과표에 표시된 부적합 항목과 재검 가능 기간, 재검 장소, 추가 비용 여부를 확인하세요. 첫 검사를 받았다는 사실만으로 의무가 끝나는 것이 아니며, 수리 후 최종 적합 판정까지 확인해야 합니다. 결과표와 결제 내역은 다음 검사일을 등록할 때까지 보관하세요.</p></section>`
    }
  ],
  'car-inspection-late-penalty': [
    {
      image: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=82',
      alt: '검사 시기를 확인해야 하는 자동차',
      extra: `<section class="series-extra"><h2>예약과 검사 완료를 구분하세요</h2><p>검사 예약을 잡았더라도 실제 검사를 받지 않았다면 검사 의무가 완료된 것이 아닙니다. 검사를 받았지만 부적합 판정 후 재검을 마치지 않은 경우도 최종 상태를 다시 확인해야 합니다. 예약 문자, 검사 결과표, 재검 결과를 시간 순서대로 정리하면 현재 상태를 판단하기 쉽습니다.</p><h2>고지서가 아직 없을 때</h2><p>전산 반영과 우편 고지에는 시간이 걸릴 수 있습니다. 고지서를 받지 못했다는 이유로 기다리기보다 공식 조회 화면에서 검사 만료일을 확인하고 가능한 가장 빠른 일정을 확보해야 합니다. 주소 변경이나 우편 반송 여부도 함께 점검하세요.</p></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=1400&q=82',
      alt: '차량 점검과 관련 서류를 함께 확인하는 모습',
      extra: `<section class="series-extra"><h2>처리 자료를 한곳에 모으세요</h2><p>자동차등록증, 검사 조회 결과, 예약 내역, 검사 결과표, 과태료 고지서, 납부 영수증을 한 폴더에 정리하면 검사와 행정처분을 따로 확인하기 쉽습니다. 법인이나 가족 차량이라면 실제 소유자와 고지 대상 명의가 같은지도 확인해야 합니다.</p><h2>특별한 사유가 있었던 경우</h2><p>도난, 중대한 사고로 인한 장기수리, 재난 등으로 검사를 받을 수 없었던 경우 별도 절차가 있을 수 있습니다. 그러나 단순 미운행은 자동 면제 사유가 아니며, 인정 요건과 신청 시점, 수리확인서나 신고 자료 등 증빙을 관할 기관에 확인해야 합니다.</p></section>`
    },
    {
      image: 'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1400&q=82',
      alt: '검사를 마친 자동차의 상태를 다시 확인하는 모습',
      extra: `<section class="series-extra"><h2>완료 여부를 다시 조회하세요</h2><p>검사소 방문 후에는 최종 적합 상태인지, 부적합 후 재검까지 완료됐는지 확인합니다. 과태료도 납부 또는 이의 절차가 끝났는지 별도로 확인해야 합니다. 전산 반영이 늦다면 결과표와 영수증을 보관한 상태에서 검사소나 고지기관에 반영 시점을 문의하세요.</p><h2>다음 검사일 관리</h2><p>만료일 하나만 달력에 넣기보다 몇 주 전 사전점검, 공식 조회, 예약 시작 알림을 나누어 등록하세요. 주소와 연락처가 바뀌었다면 차량 등록 정보도 최신 상태인지 확인해야 합니다. 안내문은 보조 수단이므로 정기적으로 공식 사이트에서 차량 상태를 직접 확인하는 습관이 필요합니다.</p></section>`
    }
  ]
};

const posts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => Array.isArray(post.series?.parts) && post.series.parts.length === 3);

for (const post of posts) {
  post.series.parts.forEach((part, index) => {
    const pageNumber = index + 1;
    const pathname = pagePath(post, pageNumber);
    const file = path.join(DIST, pathname.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(file)) return;

    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<nav class="series-progress"[\s\S]*?<\/nav>/, '');
    html = html.replace(/<span class="series-kicker">[\s\S]*?<\/span>/, '');
    html = html.replaceAll(`${pageNumber}단계 · `, '');
    html = html.replaceAll('이번 단계 핵심 요약', '핵심 내용');
    html = html.replaceAll('이전 단계', '이전 내용');

    const supplement = ENRICH[post.slug]?.[index];
    const image = part.image || supplement?.image;
    const imageAlt = part.imageAlt || supplement?.alt || part.title;
    const heading = `<h2 class="series-part-title">${escapeHtml(part.title)}</h2>`;
    const photo = image
      ? `<figure class="series-photo"><img src="${escapeAttr(image)}" alt="${escapeAttr(imageAlt)}" width="1400" height="788" ${pageNumber === 1 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`
      : '';

    html = html.replace('</header><div class="article-content">', `</header>${photo}<div class="article-content">${heading}`);
    if (supplement?.extra) html = html.replace('<div class="disclaimer">', `${supplement.extra}<div class="disclaimer">`);

    if (pageNumber > 1) {
      const title = `${part.title} | ${post.title} | 생활비서`;
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
      html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`);
    }

    fs.writeFileSync(file, html);
  });
}

console.log(`Polished ${posts.length} paginated article series.`);
