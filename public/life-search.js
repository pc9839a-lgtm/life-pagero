import { normalizeQuery, searchGuides, searchResultHref } from './life-search-core.js';

const form = document.querySelector('#page-search-form');
const input = document.querySelector('#page-search');
const results = document.querySelector('#search-results');

if (form && input && results) {
  let index = [];
  let ready = false;

  function message(value) {
    const p = document.createElement('p');
    p.textContent = value;
    results.replaceChildren(p);
  }
  function show(query) {
    const text = normalizeQuery(query);
    if (!text) {
      message('찾을 내용을 입력해 주세요.');
      return;
    }
    if (!ready) {
      message('검색 목록을 불러오는 중입니다.');
      return;
    }
    const matches = searchGuides(index, text, 20);
    if (!matches.length) {
      message('일치하는 글이 없습니다. 다른 검색어로 다시 검색해 주세요.');
      return;
    }
    const fragment = document.createDocumentFragment();
    const summary = document.createElement('p');
    summary.textContent = '검색 결과 ' + matches.length + '건' +
      (matches.length === 20 ? ' (상위 20건)' : '');
    fragment.append(summary);
    for (const item of matches) {
      const article = document.createElement('article');
      article.className = 'search-result';
      const title = document.createElement('h2');
      const anchor = document.createElement('a');
      anchor.href = searchResultHref(item.url, import.meta.url);
      anchor.textContent = item.title;
      title.append(anchor);
      const description = document.createElement('p');
      description.textContent = item.description;
      article.append(title, description);
      fragment.append(article);
    }
    results.replaceChildren(fragment);
  }

  const start = new URLSearchParams(location.search).get('q') || '';
  input.value = start;
  show(start);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url.pathname + url.search);
    show(query);
  });

  try {
    const response = await fetch(new URL('./search-index.json', import.meta.url), {
      cache: 'no-cache'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('검색 데이터 형식 오류');
    index = data;
    ready = true;
    show(input.value);
  } catch (error) {
    console.error('생활비서 검색 데이터 읽기 실패:', error);
    message('검색 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
  }
}
