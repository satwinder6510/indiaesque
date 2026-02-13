# Content Guide

How to create and structure content for the Indiaesque travel site.

## Adding a New City

When adding content for a new city:

1. Create the city folder: `src/content/{city}/`
2. Add the hub page: `src/content/{city}/_index.md`
3. **Update sitemap**: Add city to `CONTENT_CITIES` in `astro.config.mjs`
4. Add Tier 2 pages (experiences, where-to-stay, etc.)
5. Run validation: `npm run validate`

## Content Location

All content lives in `src/content/` organized by city:

```
src/content/
├── delhi/
│   ├── _index.md          # City hub (Tier 1)
│   ├── food-guide.md      # Guide page (Tier 2)
│   ├── experiences.md     # Money page (Tier 2)
│   └── best-biryani-in-delhi.md  # Micro page (Tier 3)
├── mumbai/
├── jaipur/
└── kolkata/
```

## Required Frontmatter

Every page must have these fields:

```yaml
---
title: "Best Biryani in Delhi - Top 10 Restaurants"
description: "Discover Delhi's best biryani spots, from Old Delhi legends to modern favourites. Prices, timings, and what to order."
city: delhi
tier: "3"
category: food
type: paa
status: published
datePublished: "2026-02-07"
dateModified: "2026-02-07"
schema:
  - FAQPage
  - Article
  - BreadcrumbList
tags:
  - "food"
  - "biryani"
  - "restaurants"
  - "local-food"
---
```

## Field Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title (used in `<title>` and `<h1>`) |
| `description` | string | Meta description (150-160 chars) |
| `city` | string | City slug: `delhi`, `mumbai`, `jaipur`, `kolkata` |
| `tier` | "1" \| "2" \| "3" | Content tier (see SEO Governance) |
| `category` | string | Content category (see below) |
| `type` | string | Page type: `hub`, `category`, `paa`, `blog` |
| `status` | string | `machine-draft`, `published`, `human-edited` |
| `datePublished` | string | ISO date: `"2026-02-07"` |
| `dateModified` | string | ISO date: `"2026-02-07"` |
| `schema` | array | Schema.org types to generate |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | array | Keywords for internal link matching |
| `heroImage` | string | Hero image path |
| `cardImage` | string | Card/thumbnail image |
| `duration` | string | Time required (e.g., "2-3 hours") |
| `price` | string | Price range (e.g., "₹500-1000") |
| `bestMonths` | array | Best months to visit [10, 11, 12, 1, 2, 3] |
| `goodMonths` | array | Good months to visit |
| `relatedPages` | array | Manual related page URLs |
| `parentPage` | string | Parent page URL |
| `faq` | array | FAQ items for FAQPage schema |

## Categories

### Primary Categories (Use These)

| Category | Tier | Description |
|----------|------|-------------|
| `hub` | 1 | City landing page |
| `where-to-stay` | 2 | Accommodation guide (money page) |
| `experiences` | 2 | Things to do guide (money page) |
| `neighbourhoods` | 2-3 | Area guides |
| `food-guide` | 2 | Food & dining guide |
| `things-to-do` | 2 | Activities overview |
| `heritage-guide` | 2 | Historical sites guide |
| `nightlife-guide` | 2 | Bars & clubs guide |
| `day-trips` | 2 | Day trip destinations |
| `safety-guide` | 2 | Safety information |

### Content Categories

| Category | Use For |
|----------|---------|
| `food` | Specific food content (restaurants, dishes) |
| `heritage` | Specific monuments, historical sites |
| `practical` | Travel tips, logistics, money |
| `activities` | Specific activities, tours |
| `markets` | Shopping, markets |
| `festival` | Festivals, events |
| `general` | Overview content, FAQs |

## Page Types

### Hub Pages (Tier 1)
- Filename: `_index.md`
- One per city
- Links to everything in the city

```yaml
tier: "1"
category: hub
type: hub
```

### Guide Pages (Tier 2)
- Major topic landing pages
- High authority, many inlinks

```yaml
tier: "2"
category: food-guide  # or experiences, where-to-stay, etc.
type: category
```

### Micro Pages (Tier 3)
- Specific topics, PAA content
- Support guide pages with detailed info

```yaml
tier: "3"
category: food  # or heritage, practical, etc.
type: paa
```

## Tags Best Practices

Add 3-5 relevant tags per page:

```yaml
tags:
  - "food"           # Topic
  - "street-food"    # Subtopic
  - "old-delhi"      # Location
  - "budget"         # Travel style
```

### Common Tags

**Topics:** food, heritage, nightlife, shopping, wellness, transport, safety

**Activities:** tours, walks, classes, cooking, photography, yoga

**Areas:** old-delhi, south-delhi, connaught-place, hauz-khas, chandni-chowk

**Travel Style:** first-time, budget, luxury, solo-travel, family, romantic

**Practical:** planning, money, weather, packing, visa, apps

## FAQ Section

For PAA pages, include FAQ items:

```yaml
faq:
  - question: "What is the best biryani in Delhi?"
    answer: "Karim's in Old Delhi is legendary for its Mughlai biryani..."
  - question: "How much does biryani cost in Delhi?"
    answer: "Street biryani starts at ₹80-150, restaurant biryani ₹200-500..."
```

## Writing Guidelines

### Titles
- Include main keyword
- Add location if relevant
- Keep under 60 characters for SEO

```
Good: "Best Biryani in Delhi - Top 10 Restaurants"
Bad:  "Biryani"
```

### Descriptions
- 150-160 characters
- Include primary keyword
- Compelling call to action

```
Good: "Discover Delhi's best biryani spots, from Old Delhi legends to modern favourites. Prices, timings, and what to order."
Bad:  "This page is about biryani in Delhi."
```

### Content Structure
- Start with a bold summary paragraph
- Use H2 for main sections
- Use H3 for subsections
- Include practical info (prices, timings, addresses)
- End with actionable recommendations

## Creating New Pages

1. **Check for duplicates first:**
   ```bash
   node scripts/check-duplicates.mjs --check "your-page-slug"
   ```

2. **Create the file:**
   ```
   src/content/{city}/{slug}.md
   ```

3. **Add frontmatter with all required fields**

4. **Write content following guidelines**

5. **Run validation:**
   ```bash
   npm run validate
   ```

6. **Check link report:**
   ```bash
   node scripts/link-report.mjs --city {city}
   ```

## URL Structure

URLs are generated from file paths:

| File | URL |
|------|-----|
| `delhi/_index.md` | `/delhi/` |
| `delhi/food-guide.md` | `/delhi/food-guide/` |
| `delhi/best-biryani-in-delhi.md` | `/delhi/best-biryani-in-delhi/` |
| `delhi/where-to-stay/south-delhi.md` | `/delhi/where-to-stay/south-delhi/` |

## Content Checklist

Before committing new content:

- [ ] All required frontmatter fields present
- [ ] Correct tier assigned (1, 2, or 3)
- [ ] Appropriate category selected
- [ ] 3-5 relevant tags added
- [ ] FAQ section included (for PAA pages)
- [ ] Description is 150-160 characters
- [ ] Title includes location keyword
- [ ] Validation passes (`npm run validate`)
- [ ] No duplicate content (`node scripts/check-duplicates.mjs`)
