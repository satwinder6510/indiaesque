/**
 * Shared prompt builder for AI content generation.
 * Used by both the client (prompt preview) and server (API calls).
 */

export const TONE_PROMPTS: Record<string, string> = {
  conversational: "Write in a friendly, conversational tone as if chatting with a friend about travel. Use 'you' frequently and share insights naturally.",
  professional: "Write in a professional, authoritative tone with well-researched facts. Maintain a polished, informative style suitable for a travel publication.",
  enthusiastic: "Write with enthusiasm and excitement! Use vivid language, share personal touches, and convey genuine passion for the destination.",
  practical: "Write in a practical, no-nonsense tone focused on actionable advice. Prioritize useful tips, logistics, and money-saving strategies.",
  storytelling: "Write in a narrative, storytelling style. Paint vivid pictures, share anecdotes, and take readers on a journey through the destination.",
};

export interface GeneratePromptParams {
  cityName: string;
  tone: string;
  wordCount: number;
  keywords: string[];
  questions: { question: string }[];
  facts?: string[];  // Current facts to ensure accuracy
}

export function buildGeneratePrompt(params: GeneratePromptParams): string {
  const { cityName, tone, wordCount, keywords, questions, facts = [] } = params;
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.conversational;
  const keywordsInstruction = keywords.length > 0
    ? `\n\nIMPORTANT: Naturally incorporate these keywords throughout the content: ${keywords.join(", ")}`
    : "";

  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  const factsInstruction = facts.length > 0
    ? `\n\nCRITICAL FACTS (verified current information - MUST include these):
${facts.map(f => `- ${f}`).join("\n")}`
    : "";

  return `You are an expert travel writer and SEO specialist. Create a comprehensive, SEO-optimized travel guide for ${cityName}, India.

IMPORTANT: Today's date is ${currentDate}. Use your most current knowledge. The guide should be for ${currentYear}, not any earlier year.${factsInstruction}

TONE INSTRUCTION: ${toneInstruction}

TARGET LENGTH: Aim for approximately ${wordCount} words.${keywordsInstruction}

Use these PAA questions as your guide for what to cover:
${questions.map((q) => `- ${q.question}`).join("\n")}

Create a complete hub page with this EXACT structure:

# ${cityName} Travel Guide: Everything You Need to Know [Year]

[Compelling 150-word intro paragraph that hooks the reader and includes key LSI keywords]

## Quick Facts About ${cityName}
[Brief overview with key stats - best time, language, currency tips, etc.]

## How to Get to ${cityName}
### By Air
[Airport info, airlines, taxi/metro from airport with prices]

### By Train
[Major stations, popular routes, booking tips]

### By Road
[Highway connections, bus options]

## Best Time to Visit ${cityName}
[Seasonal breakdown with pros/cons of each season]

## Where to Stay in ${cityName}
### Best Areas for Tourists
[3-4 neighborhood recommendations with character descriptions]

### Hotels by Budget
[Luxury, mid-range, budget options with price ranges in ₹]

## Top Things to Do in ${cityName}
### Must-See Attractions
[Top 5-7 attractions with practical info]

### Hidden Gems
[3-4 lesser-known spots]

### Experiences & Activities
[Unique things to do - food tours, workshops, etc.]

## ${cityName} Food Guide
### Must-Try Dishes
[Local specialties with where to find them]

### Best Restaurants & Street Food
[Specific recommendations with areas]

## Practical Tips for ${cityName}
### Safety Tips
[Honest, practical safety advice]

### Money & Costs
[Budget breakdown, tipping, bargaining]

### Getting Around
[Local transport options with prices]

## How Many Days in ${cityName}?
[Suggested itineraries: 1 day, 2-3 days, 4+ days]

## Day Trips from ${cityName}
[3-4 day trip options with distance/time]

## FAQs About ${cityName}
[Answer 5-6 key questions from the PAA list in Q&A format]

---

## Facts to Verify Before Publishing
[List 5-10 specific facts from the article that should be verified, especially:
- Prices and costs
- Opening hours and timings
- Recent infrastructure changes
- Policy or visa requirements
- Phone numbers or booking links]

---

REQUIREMENTS:
- Use proper H1 (only one), H2, H3 hierarchy
- Include specific prices in ₹ where relevant
- Add practical, actionable details (timings, costs, tips)
- Write naturally but SEO-optimized
- Target approximately ${wordCount} words
- Include local insights that show expertise
- Each section should flow naturally into the next

ACCURACY REQUIREMENTS:
- ALL prices must include the year: "₹500 (${currentYear} rates)" or "₹800-1200 (${currentYear})"
- Use ranges for prices rather than exact amounts when uncertain: "₹800-1200" not "₹950"
- Use hedging language for time-sensitive info: "typically", "usually", "check current rates"
- If you are uncertain about a specific fact (new infrastructure, policy changes, exact prices), mark it with [VERIFY: brief reason] inline
- The "Facts to Verify" section at the end MUST list specific claims that need human verification
- Do NOT invent specific restaurant names, hotel names, or business names unless you are confident they exist
- For opening hours, use "generally" or "typically" unless provided in the facts above`;
}

export interface ExpandPromptParams {
  cityName: string;
  existingContent: string;
  expandDirection: string;
  tone: string;
  targetAdditionalWords: number;
  keywords: string[];
}

export function buildExpandPrompt(params: ExpandPromptParams): string {
  const { cityName, existingContent, expandDirection, tone, targetAdditionalWords, keywords } = params;
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.conversational;
  const keywordsInstruction = keywords.length > 0
    ? `\nNaturally incorporate these keywords in the new content: ${keywords.join(", ")}`
    : "";

  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  return `You are an expert travel writer. You need to EXPAND an existing travel guide for ${cityName}, India.

IMPORTANT: Today's date is ${currentDate}. Use your most current knowledge for ${currentYear}.

TONE: ${toneInstruction}

EXPANSION DIRECTION: ${expandDirection}

TARGET: Add approximately ${targetAdditionalWords} additional words of new content.${keywordsInstruction}

HERE IS THE EXISTING CONTENT (DO NOT duplicate, rewrite, or remove any of this):
---BEGIN EXISTING CONTENT---
${existingContent}
---END EXISTING CONTENT---

INSTRUCTIONS:
1. Read the existing content carefully and understand its structure (headings, sections, topics covered)
2. Based on the expansion direction above, add NEW content that complements what already exists
3. DO NOT repeat information already covered in the existing content
4. DO NOT remove or rewrite existing sections
5. Place new sections where they logically fit in the document structure
6. If the expansion direction asks to expand an existing section, add new subsections or paragraphs within it
7. If the expansion direction asks for a new topic, add a new H2 or H3 section in the appropriate location
8. Maintain consistent formatting (markdown headings, paragraph style) with the existing content
9. Return the COMPLETE document (existing + new content merged together)

ACCURACY REQUIREMENTS:
- ALL prices must include the year: "₹500 (${currentYear} rates)" or "₹800-1200 (${currentYear})"
- Use ranges for prices rather than exact amounts: "₹800-1200" not "₹950"
- Use hedging language for time-sensitive info: "typically", "usually", "check current rates"
- If uncertain about a fact, mark it with [VERIFY: brief reason] inline
- Do NOT invent specific business names unless confident they exist

Return the full expanded document now:`;
}
