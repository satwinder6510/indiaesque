import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CATEGORIES = [
  "general",
  "food",
  "heritage",
  "markets",
  "culture",
  "nature",
  "spiritual",
  "nightlife",
  "practical"
];

const RESEARCH_PROMPT = `You are researching travel content for {cityName}, India. Your task is to discover the questions travellers ask about {cityName} and organize them into topic clusters.

## Instructions

1. Generate realistic PAA (People Also Ask) questions that travellers would search for about {cityName}
2. Include a mix of:
   - Practical questions (how to get there, best time to visit, how many days needed)
   - Experience questions (what to do, where to eat, what to see)
   - Specific attraction questions (about famous landmarks, neighborhoods)
   - Budget questions (costs, money saving tips)
   - Safety and logistics questions
3. Categorize into these clusters: ${CATEGORIES.join(", ")}
4. Write specific content direction for each question with real place names and local details

## Output Format

Return a JSON array of questions:

\`\`\`json
[
  {
    "question": "What is the best time to visit {cityName}?",
    "cluster": "practical",
    "contentDirection": "Cover monsoon vs winter vs summer. Best months are Oct-Mar. Include specific temperature ranges, festival dates (Diwali, Holi timing), and crowd levels."
  }
]
\`\`\`

## Rules

- Generate 40-60 diverse questions
- Each question must be unique and specific to {cityName}
- Content direction should mention real places, neighborhoods, prices in ₹
- Avoid generic questions that could apply to any city
- Include questions at different intent levels (informational, transactional, navigational)

Now generate PAA questions for {cityName}, India.`;

/**
 * POST /api/paa/research
 * Run AI research for a city
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { citySlug, cityName } = body;

    if (!citySlug || !cityName) {
      return NextResponse.json({ error: "citySlug and cityName required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const prompt = RESEARCH_PROMPT.replace(/{cityName}/g, cityName);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse JSON from markdown code block or raw JSON
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const questions = JSON.parse(jsonStr.trim());

    // Add IDs and metadata to questions
    const enrichedQuestions = questions.map((q: { question: string; cluster: string; contentDirection?: string }, i: number) => ({
      id: `${citySlug}-${Date.now()}-${i}`,
      question: q.question,
      cluster: q.cluster || "general",
      contentDirection: q.contentDirection || "",
      answered: false,
      source: "ai" as const,
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      questions: enrichedQuestions,
      count: enrichedQuestions.length,
    });
  } catch (error) {
    console.error("PAA research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
