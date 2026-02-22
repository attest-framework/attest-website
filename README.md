# attest-website

Documentation site for the [Attest Framework](https://github.com/attest-framework/attest) — test your AI agents like you test your code.

**Live site:** [attest-framework.github.io/attest-website](https://attest-framework.github.io/attest-website/)

## Stack

- [Astro](https://astro.build/) 5 + [Starlight](https://starlight.astro.build/) 0.37
- MDX content with custom Astro components
- [Pagefind](https://pagefind.app/) for client-side search
- GitHub Pages deployment via Actions

## Development

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # Production build → dist/
pnpm preview      # Preview production build
```

## Structure

```text
src/
├── assets/              # Logo, images
├── components/          # PipelineDiagram, ComparisonTable, CodeTabs
├── content/
│   └── docs/            # 30 MDX documentation pages
│       ├── getting-started/
│       ├── guides/
│       ├── reference/   # Python SDK, TypeScript SDK, Engine
│       ├── architecture/
│       ├── migration/
│       ├── tutorials/
│       └── blog/
├── styles/
│   └── custom.css       # Teal brand palette
└── content.config.ts    # Starlight content collection
```

## Deployment

Deploys automatically to GitHub Pages on push to `main`. Also triggers on `repository_dispatch` events (`docs-update`) from the main [attest](https://github.com/attest-framework/attest) repo when SDK source changes.

## License

Apache 2.0 — same as the [Attest Framework](https://github.com/attest-framework/attest).
