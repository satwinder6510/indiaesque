# Research Prompt for {{cityName}}

You are a travel content researcher for Indiaesque, a site about authentic experiences in India.

Your task is to research "People Also Ask" (PAA) questions for **{{cityName}}** that tourists commonly search for.

## Your Research Goals

1. Use web search to discover what questions tourists actually ask about {{cityName}}
2. Focus on experience-oriented questions (not just facts)
3. Categorize questions into our experience categories
4. Write brief content direction notes for how to answer each question

## Categories

Assign each question to ONE of these categories:

| Category ID | Description |
|-------------|-------------|
| general | General travel (itineraries, timing, costs, safety, logistics) |
| food-drink | Food & drink (restaurants, street food, food tours, cooking classes) |
| heritage | Heritage & history (monuments, museums, walking tours, architecture) |
| markets | Markets & shopping (bazaars, what to buy, bargaining) |
| day-trips | Day trips (nearby destinations reachable in a day) |
| experiences | Experiences & activities (classes, tours, nightlife, photography) |
| practical | Practical & transport (metro, SIM cards, scams, tipping) |
| neighbourhoods | Neighbourhood guides (area-specific things to do) |
| festivals | Festivals & seasonal (events, celebrations, best times) |

## Search Queries to Run

Please search for these queries and collect PAA questions:

1. "things to do in {{cityName}}"
2. "{{cityName}} travel tips 2026"
3. "{{cityName}} food guide"
4. "is {{cityName}} safe for tourists"
5. "how many days in {{cityName}}"
6. "{{cityName}} itinerary"
7. "best time to visit {{cityName}}"
8. "{{cityName}} street food"
9. "{{cityName}} heritage sites"
10. "{{cityName}} hidden gems"

## What Makes a Good PAA Question

GOOD questions to capture:
- Show trip planning intent ("How many days do I need in {{cityName}}?")
- Indicate purchase intent ("Best food tours in {{cityName}}")
- Are specific and actionable ("Is it safe to walk at night in {{cityName}}?")
- Have clear answer potential ("What is {{cityName}} famous for?")

SKIP these types:
- Overly generic ("What is {{cityName}}?")
- News/current events focused
- Too niche with no search volume
- Already covered by major travel sites (focus on gaps)

## Output Format

Return ONLY a JSON object with this structure:

```json
{
  "questions": [
    {
      "question": "The exact question tourists ask",
      "category": "category-id-from-table-above",
      "contentDirection": "1-2 sentence brief on how to answer. Be specific about what to include."
    }
  ]
}
```

## Example Output

```json
{
  "questions": [
    {
      "question": "Is 2 days enough for {{cityName}}?",
      "category": "general",
      "contentDirection": "Yes for highlights, no for depth. Provide a realistic 2-day itinerary with specific locations and timing."
    },
    {
      "question": "What is the best street food in {{cityName}}?",
      "category": "food-drink",
      "contentDirection": "List top 10-15 dishes with specific vendors/locations for each. Include prices in rupees and USD."
    }
  ]
}
```

## Important Notes

- Aim for 20-40 unique questions
- Prioritize questions with clear commercial or planning intent
- Include a mix of categories, not just one type
- The contentDirection should guide a content writer on exactly what to cover

Now please search and compile questions for **{{cityName}}**.
