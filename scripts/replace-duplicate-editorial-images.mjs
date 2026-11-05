import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content', 'posts');
const IMAGES = path.join(ROOT, 'public', 'images', 'editorial');
const SITE = 'https://pagero.kr/life';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const files = walk(CONTENT).filter((file) => file.endsWith('.json')).sort();
const posts = files.map((file) => ({ file, post: JSON.parse(fs.readFileSync(file, 'utf8')) }));
const frequencies = new Map();
for (const { post } of posts) {
  if (post.noindex) continue;
  for (const part of post.series?.parts || []) {
    if (part.image) frequencies.set(part.image, (frequencies.get(part.image) || 0) + 1);
  }
}
const duplicated = new Set([...frequencies].filter((item) => item[1] > 1).map((item) => item[0]));
const generatedPrefix = SITE + '/images/editorial/';
const xml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function textRows(raw, maxUnits, maxLines) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const characters = Array.from(text);
  const result = [];
  let row = '';
  let units = 0;
  const unit = (character) => /[^\x00-\x7F]/.test(character) ? 2 : 1;
  for (const character of characters) {
    const next = unit(character);
    if (units + next > maxUnits && row) {
      result.push(row.trim());
      row = '';
      units = 0;
      if (result.length === maxLines) break;
    }
    row += character;
    units += next;
  }
  if (result.length < maxLines && row) result.push(row.trim());
  if (result.length === maxLines && result.join('').length < text.replace(/\s/g, '').length) {
    result[result.length - 1] = result[result.length - 1].replace(/[\s·,.;:]+$/, '').slice(0, -1) + '…';
  }
  return result;
}
function lines(value, x, y, maxUnits, maxLines, size, color, lineHeight, weight = 600) {
  return textRows(value, maxUnits, maxLines).map((row, index) =>
    '<text x="' + x + '" y="' + (y + index * lineHeight) + '" fill="' + color + '" font-family="Pretendard,Noto Sans KR,Arial,sans-serif" font-size="' + size + '" font-weight="' + weight + '">' + xml(row) + '</text>'
  ).join('');
}
const themes = [
  ['#F5F8FC', '#155CB2', '#E4EFFB'],
  ['#F6F9F5', '#247055', '#E5F3EA'],
  ['#F8F7FC', '#6252AA', '#EDE9FA'],
  ['#FCF8F4', '#AC5B36', '#F9EDE4'],
  ['#F5FAFA', '#247B87', '#E4F3F4'],
  ['#FAF8FB', '#96547E', '#F4E9F1'],
];
function symbol(category, slug) {
  if (/car|vehicle|license|traffic|registration|scrap|inspection|plate|ev-/.test(slug) || category === 'car') return 'car';
  if (/child|parent|birth|diaper|youth|childcare|meeting-voucher/.test(slug)) return 'family';
  if (/house|rent|housing|heating/.test(slug)) return 'house';
  if (/tax|pension|benefit|voucher|allowance|subsidy|support/.test(slug)) return 'document';
  if (/employment|learning|work|training/.test(slug)) return 'briefcase';
  return 'check';
}
function pictogram(type, color, x, y) {
  const p = {
    car: '<path d="M12 73h178l-17-44c-4-11-13-17-25-17H55c-12 0-21 6-25 17L12 73Z"/><rect x="1" y="73" width="202" height="58" rx="18"/><path d="M45 131v20m116-20v20M45 94h31m52 0h32"/>',
    family: '<circle cx="70" cy="39" r="26"/><circle cx="140" cy="48" r="24"/><path d="M15 151v-22c0-35 23-56 55-56s55 21 55 56v22M102 151v-17c0-27 16-43 40-43s47 17 47 43v17"/>',
    house: '<path d="M12 87L103 9l91 78M33 76v81h140V76M84 157v-50h38v50M147 99h15v20h-15z"/>',
    document: '<rect x="25" y="9" width="154" height="151" rx="15"/><path d="M55 48h91M55 77h91M55 107h51M55 132h72"/>',
    briefcase: '<rect x="9" y="50" width="185" height="111" rx="16"/><path d="M66 50V28c0-11 7-18 19-18h33c11 0 19 7 19 18v22M9 104c52 37 133 37 185 0M93 118h21"/>',
    check: '<circle cx="103" cy="87" r="77"/><path d="m59 91 30 30 59-66"/>',
  };
  return '<g transform="translate(' + x + ' ' + y + ')" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round" stroke-width="10">' + p[type] + '</g>';
}
function illustration(post, part, index) {
  const seed = createHash('sha256').update(post.category + '/' + post.slug).digest();
  const palette = themes[seed[0] % themes.length];
  const [background, accent, wash] = palette;
  const primary = '#192538';
  const isMiddle = index === 1;
  const isLast = index === 2;
  const titleY = isMiddle ? 270 : isLast ? 258 : 278;
  const category = post.category === 'car' ? '자동차 생활행정' : '정부지원 · 생활정책';
  const points = (part.keyPoints || []).slice(0, 3);
  const heading = lines(part.title, 128, titleY, 39, 2, 52, primary, 69, 800);
  const description = lines(post.title, 130, 420, 69, 2, 25, '#5B6879', 34, 500);
  const itemCards = points.map((point, i) => {
    const x = 128 + i * 454;
    const y = 535 + ((i === 1 && isMiddle) ? 12 : (i === 2 && isLast) ? 12 : 0);
    return '<rect x="' + x + '" y="' + y + '" width="424" height="212" rx="24" fill="#FFFFFF" stroke="#E2E7EE" stroke-width="2"/>' +
      '<rect x="' + (x + 25) + '" y="' + (y + 24) + '" width="54" height="44" rx="13" fill="' + wash + '"/>' +
      '<text x="' + (x + 37) + '" y="' + (y + 54) + '" fill="' + accent + '" font-size="23" font-family="Arial,sans-serif" font-weight="800">0' + (i + 1) + '</text>' +
      lines(point, x + 27, y + 107, 30, 3, 24, primary, 33, 600);
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="' + xml(post.title + ' ' + part.title + ' 체크포인트') + '">' +
    '<rect width="1600" height="900" fill="' + background + '"/>' +
    '<rect x="64" y="62" width="1472" height="776" rx="35" fill="#FFFFFF"/>' +
    '<rect x="64" y="62" width="12" height="776" rx="6" fill="' + accent + '"/>' +
    '<text x="128" y="145" font-family="Arial,sans-serif" fill="' + accent + '" font-size="29" font-weight="800" letter-spacing="2">LIFE</text>' +
    '<text x="221" y="145" font-family="Pretendard,Noto Sans KR,Arial,sans-serif" fill="#667386" font-size="25" font-weight="600">생활비서</text>' +
    '<rect x="1278" y="103" width="190" height="57" rx="28" fill="' + wash + '"/>' +
    '<text x="1373" y="140" text-anchor="middle" font-family="Pretendard,Noto Sans KR,Arial,sans-serif" fill="' + accent + '" font-size="21" font-weight="700">' + xml(category) + '</text>' +
    '<rect x="1187" y="213" width="239" height="225" rx="45" fill="' + wash + '"/>' +
    pictogram(symbol(post.category, post.slug), accent, 1205, 241) +
    '<text x="129" y="216" font-family="Pretendard,Noto Sans KR,Arial,sans-serif" fill="' + accent + '" font-size="23" font-weight="700">' + xml('핵심 정리 · ' + (index + 1) + '/3') + '</text>' +
    heading + description +
    '<path d="M128 477h1320" stroke="#EDF0F4" stroke-width="3"/>' +
    itemCards +
    '<text x="128" y="794" font-family="Pretendard,Noto Sans KR,Arial,sans-serif" fill="#6B7788" font-size="21">원문과 공식 출처는 본문에서 확인하세요.</text>' +
    '<text x="1460" y="794" text-anchor="end" font-family="Arial,sans-serif" fill="' + accent + '" font-size="21" font-weight="700">' + xml('LIFE / ' + post.slug.slice(0, 24)) + '</text>' +
    '</svg>\n';
}
fs.mkdirSync(IMAGES, { recursive: true });
let updatedPosts = 0;
let generated = 0;
for (const { file, post } of posts) {
  if (post.noindex || !Array.isArray(post.series?.parts)) continue;
  let changed = false;
  for (const [index, part] of post.series.parts.entries()) {
    const previous = part.image || '';
    if (!duplicated.has(previous) && !previous.startsWith(generatedPrefix)) continue;
    const filename = post.category + '-' + post.slug + '-part-' + (index + 1) + '.svg';
    if (!/^[a-z0-9-]+\.svg$/.test(filename)) throw new Error('Unsafe editorial illustration filename: ' + filename);
    const relative = path.join(IMAGES, filename);
    const targetUrl = generatedPrefix + filename;
    fs.writeFileSync(relative, illustration(post, part, index));
    generated += 1;
    if (part.image !== targetUrl) {
      part.image = targetUrl;
      part.imageAlt = post.title + ' · ' + part.title + ' 핵심 확인 사항을 정리한 생활비서 자체 제작 도식';
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(post, null, 2) + '\n');
    updatedPosts += 1;
  }
}
const seen = new Map();
for (const { post } of posts) for (const part of post.series?.parts || []) {
  if (!part.image) continue;
  if (seen.has(part.image)) throw new Error('Duplicate article image remains: ' + part.image);
  seen.set(part.image, post.slug);
}
console.log('[images] Found ' + duplicated.size + ' repeated original image URLs; generated ' + generated + ' distinct explanatory SVG assets for ' + updatedPosts + ' articles; duplicate references: 0.');
