# Build validation

Every pull request and push to `main` runs `.github/workflows/validate.yml`.

The workflow must pass both commands before a change is considered deployable:

```bash
npm run check
npm run build
```

`npm run check` validates bundled content without writing source files. `npm run build` generates the final static site and rejects duplicate SEO tags, continuation-page sitemap leakage, visible progress-stage UI, removed editorial-policy links, and broken internal links.
