# PAA Page Generation Prompt

## Variables

- `{cityName}` - Display name of the city
- `{citySlug}` - URL slug of the city
- `{title}` - The question/title of the page
- `{slug}` - URL slug of the page
- `{category}` - Category slug
- `{contentDirection}` - Brief describing what to cover
- `{relatedPages}` - List of related pages for internal linking
- `{today}` - Current date in YYYY-MM-DD format

## Word Count Target

600-1,200 words

## Content Structure

1. **Direct answer in first paragraph** (under 50 words, bolded)
2. Detailed sections with h2 headings
3. Specific information (names, prices, distances)
4. Related questions section (brief answers + links)
5. "Plan Your Trip" navigation

## Critical: Direct Answer First

The first paragraph MUST:
- Directly answer the question
- Be under 50 words
- Be wrapped in `**bold**`
- Work as a standalone snippet for Google featured snippets

Example:
```
**Delhi is generally safe for tourists.** Violent crime against visitors is rare. The main risks are petty theft, scams near tourist sites, and aggressive touts. Use the metro, book Uber/Ola instead of street taxis, and avoid isolated areas after dark.
```

## Frontmatter Schema

```yaml
title: "{title}"
description: "[120-155 chars - include direct answer snippet]"
city: {citySlug}
category: {category}
type: paa
datePublished: {today}
dateModified: {today}
status: machine-draft
schema:
  - Article
  - BreadcrumbList
  - FAQPage
relatedPages:
  - /{citySlug}/
  - [3-5 related pages]
parentPage: /{citySlug}/
faq:
  - question: "[Related question 1]"
    answer: "[50-100 word answer]"
  - question: "[Related question 2]"
    answer: "[50-100 word answer]"
  - question: "[Related question 3]"
    answer: "[50-100 word answer]"
```

## Brand Voice

- Authoritative but friendly
- State facts directly
- Include specific details (prices in INR, distances, times)
- No hedging ("might be", "could be")
- No filler phrases

## Banned Phrases

Never use:
- "in conclusion"
- "it's worth noting"
- "delve into"
- "vibrant tapestry"
- "bustling metropolis"
- "hidden gem"
- "nestled in"
- "embark on a journey"
- "immerse yourself"
- "unforgettable experience"
- (see validator.ts for complete list)

## Internal Linking Rules

1. At least 3 internal links in body text
2. Always link to city hub (/{citySlug}/)
3. Link to relevant category page
4. Link to related PAA pages
5. Use descriptive anchor text (not "click here")

## Critical Rules

1. First paragraph must directly answer the question
2. Bold the direct answer
3. Meta description: 120-155 characters
4. Title: under 60 characters
5. At least 3 internal links
6. Include specific local details (names, prices, locations)
