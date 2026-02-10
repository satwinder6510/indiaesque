import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/content/research
 * Research PAA questions for a city and generate SEO-optimized hub content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityName, action } = body;

    if (!cityName) {
      return NextResponse.json({ error: "cityName is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    if (action === "research") {
      // Research PAA questions
      const paaPrompt = `You are an SEO expert researching "People Also Ask" questions for travel content.

For the city "${cityName}" in India, generate 15-20 realistic PAA questions that travelers commonly search for.

Categories to cover:
- Getting there (flights, trains, transport from airport)
- Best time to visit
- Where to stay (areas, hotels)
- Things to do / attractions
- Food and dining
- Safety and tips
- Day trips
- How many days needed
- Budget/costs

Return as JSON array:
{
  "questions": [
    { "question": "...", "category": "...", "searchVolume": "high|medium|low" }
  ]
}

Make questions specific to ${cityName} and realistic - the kind that appear in Google's PAA boxes.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: paaPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Unexpected response");

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Failed to parse PAA response");

      const paaData = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ success: true, ...paaData });
    }

    if (action === "generate") {
      const { questions } = body;

      // Generate full SEO-optimized hub content
      const generatePrompt = `You are an expert travel writer and SEO specialist. Create a comprehensive, SEO-optimized travel guide for ${cityName}, India.

Use these PAA questions as your guide for what to cover:
${questions.map((q: { question: string }) => `- ${q.question}`).join("\n")}

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

REQUIREMENTS:
- Use proper H1 (only one), H2, H3 hierarchy
- Include specific prices in ₹ where relevant
- Add practical, actionable details (timings, costs, tips)
- Write naturally but SEO-optimized
- Target 3000-4000 words total
- Include local insights that show expertise
- Each section should flow naturally into the next`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: generatePrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Unexpected response");

      const hubContent = content.text.trim();
      const wordCount = hubContent.split(/\s+/).length;

      return NextResponse.json({
        success: true,
        content: hubContent,
        wordCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
