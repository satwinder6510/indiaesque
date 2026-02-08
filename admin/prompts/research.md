# Research Prompt Template

This prompt is used for PAA (People Also Ask) discovery via Claude API with web search.

## Variables

- `{cityName}` - Display name of the city (e.g., "Jaipur")
- `{citySlug}` - URL slug of the city (e.g., "jaipur")
- `{seedQueries}` - List of seed search queries

## Prompt

You are researching travel content for {cityName}, India. Your task is to discover the questions travellers ask about {cityName} and create a comprehensive content plan.

### Instructions

1. Use web search to find real questions people ask about {cityName}
2. Search for each seed query and extract PAA-style questions from results
3. Include generic India travel questions adapted for {cityName}
4. Categorise into 9 categories: general, food, heritage, markets, culture, nature, spiritual, nightlife, practical
5. Write specific content direction briefs with real place names, prices in INR, and local details

### Output Format

Return JSON with this structure:

```json
{
  "pages": [
    {
      "id": "{citySlug}-hub",
      "type": "hub",
      "category": "general",
      "title": "Things To Do In {cityName} — 2026 Guide",
      "slug": "_index",
      "contentDirection": "..."
    }
  ],
  "categories": [...],
  "notes": "City-specific notes..."
}
```

### Rules

- Target 80-120 PAA pages per city
- Deduplicate similar questions
- Every page must have actionable content direction
- Include at least one category page per category with 3+ PAA questions
