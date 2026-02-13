# Indiaesque - India Travel Experiences

A comprehensive travel guide for India, covering Delhi, Mumbai, Jaipur, and Kolkata with SEO-optimized content architecture.

## Quick Start

```bash
npm install
npm run dev      # Start dev server at localhost:4321
npm run build    # Build for production (includes SEO validation)
```

## Project Structure

```
├── src/
│   ├── content/           # Markdown content (288 pages)
│   │   ├── delhi/         # 118 pages
│   │   ├── mumbai/        # 59 pages
│   │   ├── jaipur/        # 59 pages
│   │   └── kolkata/       # 52 pages
│   ├── layouts/           # Page layouts by type
│   ├── lib/               # Core libraries
│   │   ├── seo-governance.ts   # Tier rules, priority computation
│   │   └── content-index.ts    # Internal linking system
│   └── pages/             # Astro routes
├── scripts/               # Build & maintenance scripts
│   ├── seo-validate.mjs   # Build-time validation
│   ├── link-report.mjs    # Internal link analysis
│   ├── migrate-tiers.mjs  # Tier migration tool
│   └── add-tags-all.mjs   # Tag generation
├── docs/                  # Documentation
└── public/                # Static assets
```

## SEO Governance

The site uses a **tier-based content hierarchy** for authority consolidation:

| Tier | Type | Priority | Example |
|------|------|----------|---------|
| 1 | Hub | 10 | `/delhi/` |
| 2 | Guide | 9-10 | `/delhi/food-guide/`, `/delhi/experiences/` |
| 3 | Micro | 5 | `/delhi/best-biryani-in-delhi/` |

**Money pages** (`where-to-stay`, `experiences`) always have priority 10 with minimum 8 inlinks.

See [docs/SEO-GOVERNANCE.md](docs/SEO-GOVERNANCE.md) for full details.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build with SEO validation |
| `npm run validate` | Run SEO governance checks |
| `npm run preview` | Preview production build |

## Scripts

| Script | Usage |
|--------|-------|
| `node scripts/seo-validate.mjs` | Validate SEO governance rules |
| `node scripts/link-report.mjs` | Generate internal link report |
| `node scripts/link-report.mjs --city delhi` | City-specific report |
| `node scripts/migrate-tiers.mjs --dry-run` | Preview tier migration |
| `node scripts/check-duplicates.mjs` | Find duplicate content |

## Content Frontmatter

Required fields for all pages:

```yaml
---
title: "Page Title"
description: "Meta description"
city: delhi
tier: "3"           # "1", "2", or "3"
category: food      # See content.config.ts for valid values
type: paa           # hub, category, paa, blog
status: published
datePublished: "2026-02-07"
dateModified: "2026-02-07"
schema:
  - FAQPage
  - Article
  - BreadcrumbList
tags:               # For internal link matching
  - "food"
  - "street-food"
---
```

## Documentation

- [SEO Governance](docs/SEO-GOVERNANCE.md) - Tier system, linking rules, validation
- [Content Guide](docs/CONTENT-GUIDE.md) - How to create and structure content
- [Scripts Reference](docs/SCRIPTS.md) - Build and maintenance scripts

## Deployment

- **Host:** Cloudflare Pages
- **URL:** https://indiaesque.in
- **Sitemap:** https://indiaesque.in/sitemap-index.xml

## License

Proprietary - All rights reserved
