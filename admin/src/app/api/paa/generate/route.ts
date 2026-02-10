import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATE_PROMPT = `You're a travel writer who has spent years exploring India. Answer this question about {cityName} the way you'd tell a friend who's planning their trip.

Question: {question}

Use this info: {contentDirection}

Write 400-500 words in a natural, conversational tone. No headers, no bullet points, no formatting - just flowing paragraphs like a magazine article.

Start by directly answering the question, then share the details, local knowledge, and practical tips naturally woven into the narrative. Include specific prices in ₹, real place names, and timings where relevant.

Write like you're having a conversation, not giving instructions. Be warm and helpful, not formal.`;

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
