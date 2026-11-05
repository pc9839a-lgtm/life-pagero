/* Progressive enhancement only; navigation, search, and articles remain accessible without JS. */
(() => {
  "use strict";
  const filter = document.querySelector("#modern-list-filter");
  if (filter) {
    const cards = [...document.querySelectorAll(".life-modern-category .post-list .post-card")];
    const count = document.querySelector("#modern-list-count");
    const empty = document.querySelector("#modern-list-empty");
    const update = () => {
      const query = filter.value.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
      let found = 0;
      cards.forEach(card => {
        const haystack = (card.textContent || "").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
        const match = !query || haystack.includes(query);
        card.hidden = !match;
        if (match) found += 1;
      });
      if (count) count.textContent = found + "개의 글";
      if (empty) empty.hidden = found !== 0;
    };
    filter.addEventListener("input", update);
    update();
  }

  // The search page already has a working source-index and submit fallback.
  // Add input-driven results without changing its URL or official source content.
  const searchInput = document.querySelector("#page-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (typeof window.go === "function") window.go(searchInput.value);
    });
  }
})();
