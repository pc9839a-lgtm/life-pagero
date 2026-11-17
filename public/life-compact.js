/* Keep the native details/summary disclosure working without JS.
   Enhance direct "read full guide" links to expand before scrolling. */
(() => {
  "use strict";
  document.querySelectorAll('[data-compact-open="true"]').forEach(link => {
    link.addEventListener("click", event => {
      const guide = document.getElementById("compact-full-guide");
      if (!guide) return;
      // A table-of-contents link has its own precise section anchor.
      // Open the guide but preserve native hash navigation to that section.
      if (link.closest('.life-guide-jumps')) {
        guide.open = true;
        return;
      }
      event.preventDefault();
      guide.open = true;
      guide.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
      history.replaceState(null,"","#compact-full-guide");
    });
  });
  if (location.hash === "#portal-article-detail" || location.hash === "#compact-full-guide"
      || /^#life-guide-part-[1-3]$/.test(location.hash)) {
    const guide = document.getElementById("compact-full-guide");
    if (guide) guide.open = true;
  }
})();
