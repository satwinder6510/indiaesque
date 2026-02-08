# Hub Page Generation Prompt

## Variables

- `{cityName}` - Display name of the city
- `{citySlug}` - URL slug of the city
- `{relatedPages}` - List of related pages for internal linking
- `{today}` - Current date in YYYY-MM-DD format

## Word Count Target

2,500-3,000 words

## Content Structure

1. Opening paragraph with city overview
2. Table of contents linking to sections
3. Category sections (Food, Heritage, Markets, etc.)
4. Practical information (best time, transport, accommodation)
5. FAQ section (5-8 questions)
6. Related pages navigation

## Brand Voice

- Knowledgeable local friend, not corporate travel guide
- Use "you" freely
- Be direct, state facts, don't hedge
- Include specific prices in INR with USD conversion
- Name specific places, streets, metro stations

## Frontmatter Schema

```yaml
title: "Things To Do In {cityName} — 2026 Guide"
description: "[120-155 chars]"
city: {citySlug}
category: general
type: hub
datePublished: {today}
dateModified: {today}
status: machine-draft
schema:
  - Article
  - BreadcrumbList
  - TouristDestination
  - FAQPage
relatedPages:
  - /{citySlug}/food-tours/
  - [other related pages]
parentPage: /
faq:
  - question: "..."
    answer: "..."
```

## Critical Rules

1. Include at least 5 internal links in body text
2. Meta description: 120-155 characters
3. Title: under 60 characters
4. FAQ answers must match content in FAQ section
5. No banned phrases (see validator.ts for full list)
