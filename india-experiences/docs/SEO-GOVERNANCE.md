# SEO Governance System

This document describes the tier-based SEO architecture that enforces consistent authority consolidation across the site.

## Overview

The governance system ensures:
- Higher-tier pages always have more authority than lower-tier pages
- Money pages (where-to-stay, experiences) are properly prioritized
- Internal linking follows strict rules to concentrate link equity
- Build fails if critical SEO rules are violated

## Tier Structure

| Tier | Name | Priority | Description | Example URLs |
|------|------|----------|-------------|--------------|
| 1 | Hub | 10 | City landing pages | `/delhi/`, `/mumbai/` |
| 2 | Guide | 9-10 | Authority/category pages | `/delhi/food-guide/`, `/delhi/experiences/` |
| 3 | Micro | 5 | PAA content, specific topics | `/delhi/best-biryani-in-delhi/` |

### Tier 1 - Hub Pages
- One per city (`_index.md`)
- Always priority 10
- Links to ALL Tier 2 and Tier 3 pages in the city
- Must have the highest inlink count in the city

### Tier 2 - Guide Pages
- Authority pages for major topics
- Priority 9 (or 10 for money pages)
- Links to hub + 3 other Tier 2 + up to 10 Tier 3 pages
- Required pages per city: `where-to-stay`, `experiences`

### Tier 3 - Micro Pages
- PAA (People Also Ask) content
- Specific topic pages
- Priority 5
- Links to hub + 5 Tier 2 + 6 related Tier 3 pages

## Money Page Rules

Money pages are commercial landing pages that drive conversions:
- Categories: `where-to-stay`, `experiences`
- **Always priority 10** (computed, cannot be overridden)
- Minimum 8 inlinks required
- Maximum click depth: 3

```typescript
// Priority is computed, not manual
if (category === 'where-to-stay' || category === 'experiences') {
  return 10; // Always
}
```

## Area Page Rules

Pages nested under `/where-to-stay/` are area pages:

```
/delhi/where-to-stay/           → Tier 2, category: where-to-stay
/delhi/where-to-stay/south-delhi/ → Tier 3, category: neighbourhoods
```

Area pages must:
- Be Tier 3 (not Tier 2)
- Have category `neighbourhoods` (not `where-to-stay`)
- Only ONE `where-to-stay` category page per city allowed

## Internal Linking Rules

### Links by Tier

| From Tier | To Hub | To Tier 2 | To Tier 3 |
|-----------|--------|-----------|-----------|
| Tier 1 | - | ALL | 12 visible + rest collapsible |
| Tier 2 | Yes | 3 others | 10 max |
| Tier 3 | Yes | 5 | 6 related |

### Link Scoring Algorithm

Related pages are selected by score:
```
score = 0
if (same category) score += 10
for (each matching tag) score += 3
score += priority * 0.5
score += 1  // base
```

Pages with highest scores are linked.

### URL Hash Rotation

To ensure even link distribution across Tier 2 pages, links are rotated based on URL hash:
```javascript
const urlHash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
const rotateOffset = urlHash % tier2Pages.length;
```

## Authority Shape Enforcement

The system enforces proper authority distribution:

1. **Hub highest:** City hub must have more inlinks than any other page in the city
2. **Tier 2 > Tier 3:** Average Tier 2 inlinks must exceed average Tier 3 inlinks
3. **No orphans:** Every non-hub page must have at least 1 inlink (error if 0)

## Build-Time Validation

The `seo-validate.mjs` script runs during build and checks:

### Critical Errors (Build Fails)
- Missing required fields: `city`, `tier`, `category`
- Tier 1 assigned to non-hub page
- Money page without priority 10
- Area page with wrong tier or category
- Missing required Tier 2 pages per city
- Money page with < 8 inlinks
- Authority shape violation (T2 avg <= T3 avg)
- Orphan pages (0 inlinks)

### Warnings (Build Continues)
- Underlinked pages (1 inlink)
- Link dilution (> 50 inlinks)

## Categories

### Governance Categories (Preferred)
```
hub, guide, micro, where-to-stay, experiences, neighbourhoods,
things-to-do, food-guide, nightlife-guide, day-trips, heritage-guide, safety-guide
```

### Legacy Categories (Supported)
```
general, food, heritage, practical, activities, transport,
shopping, culture, wellness, markets, nature, spiritual,
nightlife, festival, daytrips, neighbourhood
```

## Tags

Tags improve internal link matching. Add 3-5 relevant tags per page:

```yaml
tags:
  - "food"
  - "street-food"
  - "local-food"
  - "chandni-chowk"
```

Common tag categories:
- **Topics:** food, heritage, nightlife, shopping, wellness
- **Activities:** tours, walks, classes, experiences
- **Areas:** old-delhi, south-delhi, connaught-place
- **Travel type:** first-time, budget, luxury, solo-travel

## Files

| File | Purpose |
|------|---------|
| `src/lib/seo-governance.ts` | Core rules, priority computation, validation functions |
| `src/lib/content-index.ts` | Internal linking system, tier-based link selection |
| `scripts/seo-validate.mjs` | Build-time validation script |
| `scripts/link-report.mjs` | Link analysis and reporting |

## Validation Commands

```bash
# Run validation
npm run validate

# Run with strict mode (warnings = errors)
node scripts/seo-validate.mjs --strict

# Generate link report
node scripts/link-report.mjs

# City-specific report
node scripts/link-report.mjs --city delhi

# JSON output
node scripts/link-report.mjs --json
```

## Example Validation Output

```
============================================================
SEO GOVERNANCE VALIDATION
============================================================

✓ All pages have required fields
✓ Tier structure is valid
✓ All money pages have priority 10
✓ Area page governance is valid
✓ All cities have required Tier 2 pages
✓ All money pages have sufficient inlinks
✓ Authority shape is valid
⚠ 10 underlinked pages (1 inlink)

Errors: 0
Warnings: 14

✅ VALIDATION PASSED
```
