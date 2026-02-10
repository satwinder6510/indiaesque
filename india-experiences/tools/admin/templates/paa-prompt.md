# PAA Answer Page Generation Prompt

You are writing a PAA (People Also Ask) answer page for **{{cityName}}** on Indiaesque, a travel experience site.

## Page Details
- **Title**: {{pageTitle}}
- **Slug**: /{{citySlug}}/{{pageSlug}}/
- **Type**: PAA Answer Page
- **Category**: {{category}}
- **Target Word Count**: 600-1,200 words

## City Context
{{cityDescription}}

## Content Direction
{{contentDirection}}

## Related Pages to Link To
{{relatedPages}}

## Brand Voice

Write in a friendly, knowledgeable tone. Be direct and specific. Answer the question immediately.

### DO:
- **Answer the question in the first 50 words** (for featured snippet)
- Use specific details (prices in ₹ and $, times, locations)
- Be honest and practical
- Give actionable advice
- Use "you" to address the reader

### DON'T use these phrases:
{{bannedPhrases}}

### Markdown Formatting Rules (CRITICAL)
- **Blank line before ALL headings**: ALWAYS put a blank line before #, ##, ###, ####, etc.
- **Blank line after ALL headings**: ALWAYS put a blank line after headings before content
- **Lists with labels**: Use `- **Label:** value` format (with dash)
- **Paragraphs**: Use blank lines between paragraphs

## Critical: Direct Answer First

The FIRST paragraph must directly answer the question in the title. This is critical for Google featured snippets. Start with a bold statement that answers the question, then expand.

Example for "Is Delhi safe for tourists?":
> **Delhi is generally safe for tourists.** Violent crime against visitors is rare. The main risks are petty theft, scams near tourist sites, and aggressive touts. Use the metro, book Uber/Ola instead of street taxis, and avoid isolated areas after dark.

## Required Sections

1. **Direct Answer** (50-100 words)
   - Bold opening sentence that directly answers the question
   - Key supporting points
   - This should stand alone as a complete answer

2. **Detailed Explanation** (300-500 words)
   - Break into 2-4 subsections with ## headings
   - Each subsection covers a specific aspect
   - Include specific examples and details
   - Add practical tips

3. **Related Questions** (200-300 words)
   - 2-3 related questions with brief answers
   - These become the FAQ schema
   - Link to dedicated pages if they exist

4. **Next Steps / Plan Your Trip** (100 words)
   - Links to city hub and relevant category pages
   - Suggest related experiences

## Output Format

Return the content in this exact format:

```
---
title: "{{pageTitle}}"
description: "120-155 character meta description that includes a direct answer snippet"
schema:
  - FAQPage
  - Article
  - BreadcrumbList
relatedPages:
  - /{{citySlug}}/related-page-1/
  - /{{citySlug}}/related-page-2/
faq:
  - question: "Related question 1?"
    answer: "Brief answer that could stand alone."
  - question: "Related question 2?"
    answer: "Brief answer that could stand alone."
---

**Direct answer in bold that answers {{pageTitle}}** followed by 2-3 supporting sentences that complete the featured snippet paragraph.

## First Detailed Section

Content here...

## Second Detailed Section

Content here...

## Related Questions

### Related question 1?

Answer here...

### Related question 2?

Answer here...

## Plan Your {{cityName}} Trip

- [Complete {{cityName}} Guide](/{{citySlug}}/)
- [Other relevant link](/{{citySlug}}/category/)
```

## Internal Linking

Include at least 3 internal links:
- Link to the city hub page
- Link to the relevant category page
- Link to 1-2 related PAA pages
- Use descriptive anchor text

## Word Count Guidelines

- Simple factual questions: 600-800 words
- Complex questions requiring nuance: 800-1,000 words
- Questions with multiple aspects: 1,000-1,200 words

Now write the complete PAA answer page for **{{pageTitle}}** about **{{cityName}}**.
