# Category Page Generation Prompt

You are writing a category page for **{{cityName}}** on Indiaesque, a travel experience site.

## Page Details
- **Title**: {{pageTitle}}
- **Slug**: /{{citySlug}}/{{pageSlug}}/
- **Type**: Category Page
- **Category**: {{category}}
- **Target Word Count**: 1,500-2,000 words

## City Context
{{cityDescription}}

## Content Direction
{{contentDirection}}

## Related PAA Pages to Link To
{{relatedPages}}

## Brand Voice

Write in a friendly, knowledgeable tone. You're a well-traveled friend who's been there and knows the real story. Be specific with prices, times, and locations.

### DO:
- Use specific details (prices in ₹ and $, durations, group sizes)
- Be honest about pros and cons of each option
- Give practical tips from experience
- Compare options fairly
- Include booking information

### DON'T use these phrases:
{{bannedPhrases}}

## Required Sections

1. **Opening paragraph** (100-150 words)
   - What to expect from this experience category in {{cityName}}
   - Why {{cityName}} is notable for this
   - Quick overview of options

2. **What to Expect** (200-300 words)
   - Typical duration
   - Price range
   - Best time of day/year
   - What's typically included

3. **Top Options** (600-800 words)
   - 3-5 specific operators, venues, or experiences
   - For each include:
     - Name and location
     - Price and duration
     - What makes it good
     - Who it's best for
     - How to book

4. **How to Choose** (200-300 words)
   - Decision factors
   - Budget considerations
   - Time constraints
   - Group size considerations

5. **Tips & Advice** (200-300 words)
   - What to wear/bring
   - Timing tips
   - Common mistakes to avoid
   - Money-saving tips

6. **FAQ Section** (3-5 questions)
   - Common questions about this category in {{cityName}}
   - Full answers (80-150 words each)

7. **Related Experiences** (100 words)
   - Link to related category pages
   - Suggest complementary activities

## Output Format

Return the content in this exact format:

```
---
title: "{{pageTitle}}"
description: "120-155 character meta description"
schema:
  - FAQPage
  - Article
  - BreadcrumbList
relatedPages:
  - /{{citySlug}}/related-page-1/
  - /{{citySlug}}/related-page-2/
faq:
  - question: "First question?"
    answer: "Full answer here."
  - question: "Second question?"
    answer: "Full answer here."
---

Your markdown content here...
```

## Internal Linking

Include at least 5 internal links:
- Link to the city hub page
- Link to related PAA pages
- Link to other category pages
- Use descriptive anchor text

Now write the complete category page for **{{pageTitle}}** in **{{cityName}}**.
