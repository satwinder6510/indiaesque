# Hub Page Generation Prompt

You are writing a comprehensive city hub page for **{{cityName}}** on Indiaesque, a travel experience site.

## Page Details
- **Title**: {{pageTitle}}
- **Slug**: /{{citySlug}}/
- **Type**: City Hub Page
- **Target Word Count**: 2,500-3,000 words

## City Context
{{cityDescription}}

## Content Direction
{{contentDirection}}

## Related Pages to Link To
{{categoryPages}}

## Brand Voice

Write in a friendly, knowledgeable tone. You're a well-traveled friend who's been there and knows the real story. Be specific with prices, times, and locations. Use rupee amounts with USD equivalents.

### DO:
- Use specific details (prices in ₹ and $, exact addresses, opening hours)
- Be honest about downsides (pollution, crowds, heat)
- Give practical tips from experience
- Use "you" to address the reader directly
- Include concrete examples and specific recommendations

### DON'T use these phrases (they signal AI writing):
{{bannedPhrases}}

## Required Sections

1. **Opening paragraph** (100-150 words)
   - Hook the reader immediately
   - Mention what makes {{cityName}} unique
   - Set expectations (good and challenging)

2. **Quick Facts Box** (bullet points)
   - Best time to visit
   - How many days needed
   - Getting there
   - Budget per day

3. **Experience Categories** (each 200-300 words)
   - Food & Drink Experiences (link to food-tours page)
   - Heritage & History (link to heritage-walks page)
   - Markets & Shopping (link to markets-shopping page)
   - Day Trips (link to day-trips page)
   - Experiences & Activities (link to experiences page)

4. **Practical Information** (400-500 words)
   - Getting around
   - Where to stay by budget
   - Safety tips
   - Money and costs

5. **FAQ Section** (5-8 questions)
   - Include the most common questions about {{cityName}}
   - Give full answers (100-200 words each)
   - These will be used for FAQ schema

6. **When to Visit** (200-300 words)
   - Month-by-month breakdown
   - Festival dates
   - Weather considerations

## Output Format

Return the content in this exact format:

```
---
title: "{{pageTitle}}"
description: "120-155 character meta description with primary keyword"
schema:
  - TouristDestination
  - FAQPage
  - Article
  - BreadcrumbList
relatedPages:
  - /{{citySlug}}/food-tours/
  - /{{citySlug}}/heritage-walks/
faq:
  - question: "First question?"
    answer: "Full answer here."
  - question: "Second question?"
    answer: "Full answer here."
---

Your markdown content here with ## headings for sections...
```

## Internal Linking

Include at least 10 internal links throughout the content:
- Link to category pages when mentioning topics
- Use descriptive anchor text (not "click here")
- Format: [Best food tours in {{cityName}}](/{{citySlug}}/food-tours/)

Now write the complete hub page for **{{cityName}}**.
