# Scripts Reference

Documentation for build and maintenance scripts in the `scripts/` directory.

## Overview

| Script | Purpose | Run During Build |
|--------|---------|------------------|
| `seo-validate.mjs` | Validate SEO governance rules | Yes |
| `link-report.mjs` | Generate internal link analysis | No |
| `migrate-tiers.mjs` | Add tier field to pages | No |
| `add-tags-all.mjs` | Generate tags from content | No |
| `add-tags-orphans.mjs` | Add tags to orphan pages | No |
| `check-duplicates.mjs` | Find duplicate content | No |

---

## seo-validate.mjs

Build-time validation of SEO governance rules. Runs automatically during `npm run build`.

### Usage

```bash
# Standard validation
node scripts/seo-validate.mjs

# Strict mode (warnings become errors)
node scripts/seo-validate.mjs --strict
```

### Checks Performed

**Critical (Build Fails):**
- Missing required fields (city, tier, category)
- Tier 1 assigned to non-hub pages
- Money page priority not 10
- Area page with wrong tier/category
- Missing required Tier 2 pages per city
- Money pages with < 8 inlinks
- Authority shape violations
- Orphan pages (0 inlinks)

**Warnings (Build Continues):**
- Underlinked pages (1 inlink)
- Link dilution (> 50 inlinks)

### Output Example

```
============================================================
SEO GOVERNANCE VALIDATION
============================================================

✓ All pages have required fields
✓ Tier structure is valid
✓ All money pages have priority 10
✓ All cities have required Tier 2 pages
✓ All money pages have sufficient inlinks
✓ Authority shape is valid
⚠ 10 underlinked pages (1 inlink)

SUMMARY STATISTICS
----------------------------------------
Total Pages: 288
Tier 1: 4 pages
Tier 2: 62 pages
Tier 3: 222 pages
Priority 10 pages: 22

Errors: 0
Warnings: 14

✅ VALIDATION PASSED
```

---

## link-report.mjs

Generates comprehensive internal link analysis reports.

### Usage

```bash
# Full report
node scripts/link-report.mjs

# City-specific report
node scripts/link-report.mjs --city delhi

# JSON output (for programmatic use)
node scripts/link-report.mjs --json
```

### Options

| Option | Description |
|--------|-------------|
| `--city <name>` | Filter report to specific city |
| `--json` | Output as JSON instead of text |

### Report Sections

1. **Summary:** Total pages, links, average links per page
2. **Tier Distribution:** Count of pages per tier
3. **Top 20 by Inlinks:** Most linked pages (should be hubs/guides)
4. **City Expansion Readiness:** Required Tier 2 page status
5. **Tier Distribution by City:** Per-city breakdown
6. **Orphan Pages:** Pages with < 2 inlinks
7. **Overlinked Pages:** Pages with > 50 inlinks

### Output Example

```
============================================================
INTERNAL LINK ANALYSIS REPORT
============================================================

Total Pages: 288
Total Internal Links: 3816
Avg Links per Page: 13.3

--- TIER DISTRIBUTION (Overall) ---
Tier 1 (Hub):   4 pages
Tier 2 (Guide): 62 pages
Tier 3 (Micro): 222 pages

--- TOP 20 PAGES BY INLINKS ---
 1. [117 links] HUB   /delhi/
 2. [ 58 links] HUB   /jaipur/
 3. [ 58 links] HUB   /mumbai/
...

--- CITY EXPANSION READINESS ---
✓ DELHI: 100%
  Tier 2: 18 | Tier 3: 99
✓ MUMBAI: 100%
  Tier 2: 14 | Tier 3: 44

--- ORPHAN PAGES (< 2 INLINKS) ---
Total orphans: 10
```

---

## migrate-tiers.mjs

Adds the `tier` field to content pages based on existing data.

### Usage

```bash
# Preview changes (no files modified)
node scripts/migrate-tiers.mjs --dry-run

# Apply migration
node scripts/migrate-tiers.mjs

# Migrate specific city
node scripts/migrate-tiers.mjs --city delhi
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without writing files |
| `--city <name>` | Only migrate pages in specified city |

### Tier Assignment Logic

1. Hub pages (`_index.md` or `type: hub`) → Tier 1
2. Pages with `priority >= 9` or guide categories → Tier 2
3. Everything else → Tier 3

### Output

```
Processing: delhi/_index.md
  Assigned tier: 1 (hub page)
Processing: delhi/food-guide.md
  Assigned tier: 2 (priority 9)
Processing: delhi/best-biryani-in-delhi.md
  Assigned tier: 3 (default)

Done: 288 processed, 288 updated, 0 skipped
```

---

## add-tags-all.mjs

Generates tags for pages based on category and title keywords.

### Usage

```bash
# Preview tags
node scripts/add-tags-all.mjs --dry-run

# Add tags to all pages without tags
node scripts/add-tags-all.mjs

# City-specific
node scripts/add-tags-all.mjs --city delhi
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview tags without writing files |
| `--city <name>` | Only process pages in specified city |

### Tag Generation Logic

1. **Category-based tags:** Each category maps to base tags
   ```
   food → ["food", "where-to-eat"]
   heritage → ["heritage", "history", "monuments"]
   ```

2. **Keyword-based tags:** Title keywords add specific tags
   ```
   "biryani" → ["biryani", "local-food", "restaurants"]
   "metro" → ["metro", "transport"]
   ```

### Output

```
/delhi/best-biryani-in-delhi.md: food, where-to-eat, biryani, local-food, restaurants
/delhi/delhi-metro-map-and-tips.md: practical, planning, metro, transport

Updated: 260, Skipped: 28
```

---

## add-tags-orphans.mjs

Adds targeted tags to specific orphan pages (pages with few inlinks).

### Usage

```bash
node scripts/add-tags-orphans.mjs
```

### How It Works

Contains a manual mapping of orphan page slugs to appropriate tags:

```javascript
const TAG_MAPPINGS = {
  'delhi/is-delhi-safe-for-tourists': ['safety', 'practical', 'first-time'],
  'delhi/what-currency-does-delhi-use': ['money', 'practical', 'planning'],
  // ...
};
```

Run this after identifying orphans via `link-report.mjs`.

---

## check-duplicates.mjs

Finds content pages with similar intent to prevent duplication.

### Usage

```bash
# Check all pages for duplicates
node scripts/check-duplicates.mjs

# Check before creating new page
node scripts/check-duplicates.mjs --check "best-restaurants-mumbai"
```

### Options

| Option | Description |
|--------|-------------|
| `--check <slug>` | Check if slug would duplicate existing content |

### Detection Logic

Uses normalized slug comparison with Levenshtein distance:
- Removes common words (best, top, guide, in, for, etc.)
- Calculates similarity percentage
- Warns if > 60% similar

### Output

```
Checking for duplicates of: best-restaurants-mumbai

⚠️  Potential duplicates found:
  - /mumbai/best-restaurants-jaipur/ (72% similar)
  - /mumbai/restaurants-mumbai/ (68% similar)

Consider merging or differentiating content.
```

---

## Adding Scripts to Build

Scripts are configured in `package.json`:

```json
{
  "scripts": {
    "validate": "node scripts/seo-validate.mjs",
    "build": "npm run validate && astro build",
    "link-report": "node scripts/link-report.mjs"
  }
}
```

The validation script runs automatically before every build.

---

## Common Workflows

### After Adding New Content

```bash
# 1. Validate SEO rules
npm run validate

# 2. Check link distribution
node scripts/link-report.mjs --city {city}

# 3. Build site
npm run build
```

### Fixing Orphan Pages

```bash
# 1. Identify orphans
node scripts/link-report.mjs | grep -A 20 "ORPHAN PAGES"

# 2. Add tags to improve matching
node scripts/add-tags-orphans.mjs

# 3. Verify improvement
node scripts/link-report.mjs
```

### Before Creating New Page

```bash
# Check for duplicates
node scripts/check-duplicates.mjs --check "your-page-slug"
```

### Bulk Tag Generation

```bash
# Preview
node scripts/add-tags-all.mjs --dry-run

# Apply
node scripts/add-tags-all.mjs
```
