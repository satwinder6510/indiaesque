import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATE_PROMPT = `You are writing SEO-optimized travel content for {cityName}, India.

## The Question
{question}

## Content Direction
{contentDirection}

## Writing Instructions

1. **First Paragraph**: Directly answer the question in 2-3 sentences. Be specific and helpful.

2. **Body Content**: Expand with practical details:
   - Use real place names, neighborhoods, landmarks
   - Include prices in ₹ (Indian Rupees) where relevant
   - Add timing info (hours, seasons, best times)
   - Include local tips that only someone who's been there would know

3. **Writing Style**:
   - Conversational but authoritative
   - Use "you" to address the reader
   - Short paragraphs (2-4 sentences each)
   - Include specific numbers and facts
   - No fluff or filler content

4. **Word Count**: Target 400-600 words. Quality over quantity.

5. **Formatting**:
   - Use markdown headers (## for sections)
   - Use bullet points for lists
   - Bold key information

## Output
Write the article content only. No title (the question is the title). Start directly with the answer.`;

/**
 * POST /api/paa/generate
 * Generate answer content for a PAA question
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityName, question, contentDirection } = body;

    if (!question || !cityName) {
      return NextResponse.json({ error: "question and cityName required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const prompt = GENERATE_PROMPT
      .replace(/{cityName}/g, cityName)
      .replace(/{question}/g, question)
      .replace(/{contentDirection}/g, contentDirection || "No specific direction provided. Use your knowledge of Indian travel.");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const answer = content.text.trim();
    const wordCount = answer.split(/\s+/).length;

    return NextResponse.json({
      success: true,
      answer,
      wordCount,
    });
  } catch (error) {
    console.error("PAA generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
