# Build validation

Every pull request, push to `main`, manual run, and daily scheduled run uses `.github/workflows/validate.yml`.

Required commands:

```bash
npm run check
npm run build
npm run validate:external
```

The pipeline verifies:

- bundled content paths without modifying source files during `check`
- three rich content parts and bounded official-host matching
- a complete indexable first URL containing all three visible content parts
- `noindex,follow` self-canonical continuation pages excluded from the sitemap
- one robots tag and one canonical tag per HTML document
- Article, Breadcrumb, and visible FAQ structured data only on the complete base page
- no visible progress-stage UI
- no generated editorial-policy page or link
- no broken internal links
- external official links and images, with hard failure on HTTP 404/410

External network timeouts and temporary 5xx responses are reported as warnings so transient outages do not block deployment.
