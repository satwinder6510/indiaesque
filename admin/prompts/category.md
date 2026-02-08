# Category Page Generation Prompt

## Variables

- `{cityName}` - Display name of the city
- `{citySlug}` - URL slug of the city
- `{categoryName}` - Name of the category (e.g., "Food Tours")
- `{categorySlug}` - Slug of the category (e.g., "food-tours")
- `{relatedPages}` - List of PAA pages in this category
- `{today}` - Current date in YYYY-MM-DD format

## Word Count Target

1,500-2,000 words

## Content Structure

1. Opening paragraph with category overview
2. What to expect section (duration, price range, format)
3. Best options section (operator listings with details)
4. How to book section
5. Tips section
6. FAQ section (3-5 questions)
7. Related pages (other categories in same city, same category in other cities)

## Operator Listing Format

For each operator/experience:
- Name
- Duration
- Price in INR with USD conversion
- Group size
- What's included
- Why it's good / who it's for

## Frontmatter Schema

```yaml
title: "Best {categoryName} In {cityName} — 2026 Guide"
description: "[120-155 chars including price range]"
city: {citySlug}
category: {categorySlug}
type: category
datePublished: {today}
dateModified: {today}
status: machine-draft
schema:
  - Article
  - BreadcrumbList
  - FAQPage
relatedPages:
  - /{citySlug}/
  - [related PAA pages]
parentPage: /{citySlug}/
faq:
  - question: "..."
    answer: "..."
```

## Critical Rules

1. Include at least 3 internal links in body text
2. Link to city hub page
3. Link to related PAA pages
4. Include specific prices and durations
5. No banned phrases
