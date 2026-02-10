import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATE_PROMPT = `Write a comprehensive travel guide article answering this question about {cityName}, India.

QUESTION: {question}

CONTENT GUIDANCE: {contentDirection}

REQUIREMENTS:
- Write 400-600 words minimum (this is mandatory - do not write less)
- Start with a direct answer in the first paragraph (2-3 sentences)
- Then expand with 3-4 detailed sections covering different aspects
- Include specific details: real place names, prices in ₹, timings, distances
- Write in second person ("you") with a helpful, knowledgeable tone
- Use markdown: ## for section headers, bullet points for lists, **bold** for key info

STRUCTURE YOUR RESPONSE LIKE THIS:

[Opening paragraph - direct answer to the question, 2-3 sentences]

## [First aspect/section]
[2-3 paragraphs with specific details, prices, times, local tips]

## [Second aspect/section]
[2-3 paragraphs with practical information, recommendations]

## [Third aspect/section]
[2-3 paragraphs with additional helpful details]

## Quick Tips
- [Bullet point tips]
- [More practical advice]
- [Local insider knowledge]

IMPORTANT: You must write at least 400 words. This is a full article, not a short answer. Include real place names, actual prices in Indian Rupees (₹), specific timings, and practical traveler advice. Make it genuinely useful for someone planning to visit {cityName}.

Now write the complete article:`;

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
      max_tokens: 4000,
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
