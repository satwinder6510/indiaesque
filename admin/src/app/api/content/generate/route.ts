import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TONE_STYLES: Record<string, string> = {
  conversational: "Write like you're having a warm conversation with a friend. Be casual, engaging, and relatable. Use contractions and personal anecdotes.",
  professional: "Write in a polished, authoritative style suitable for a premium travel magazine. Be informative yet elegant, with sophisticated vocabulary.",
  enthusiastic: "Write with energy and excitement! Share your passion for travel and discovery. Use vivid descriptions that make readers eager to visit.",
  practical: "Write in a straightforward, no-nonsense style focused on actionable information. Be direct and helpful, prioritizing usefulness over flair.",
  storytelling: "Write as if telling a captivating story. Draw readers in with narrative flow, sensory details, and a sense of journey and discovery.",
};

const buildPrompt = (
  cityName: string,
  question: string,
  contentDirection: string,
  tone: string,
  wordCount: number,
  keywords: string[]
) => {
  const toneInstruction = TONE_STYLES[tone] || TONE_STYLES.conversational;
  const keywordInstruction = keywords.length > 0
    ? `\n\nNaturally incorporate these keywords/phrases: ${keywords.join(", ")}`
    : "";

  const sectionCount = Math.max(3, Math.ceil(wordCount / 400));

  return `You're a travel writer who has spent years exploring India. Create a comprehensive, well-structured article about ${cityName}.

TOPIC: ${question}

CONTEXT: ${contentDirection || "Use your knowledge of Indian travel."}

TONE: ${toneInstruction}

TARGET: Approximately ${wordCount} words across ${sectionCount}-${sectionCount + 2} sections.

OUTPUT FORMAT - Use this exact markdown structure:

## [Section Heading]

[IMAGE: descriptive caption for an ideal image here]

[2-4 paragraphs of engaging content for this section]

---

## [Next Section Heading]

[IMAGE: descriptive caption]

[2-4 paragraphs]

---

(continue pattern)

REQUIREMENTS:
1. Start with a compelling intro section (no "Introduction" heading - use a creative title)
2. Each section should have a descriptive H2 heading
3. Each section should suggest ONE ideal image with [IMAGE: caption describing what photo would work]
4. Write 2-4 flowing paragraphs per section (no bullet points within sections)
5. End sections with --- divider (except the last section)
6. Include specific details: prices in ₹, timings, real place names, local tips
7. Final section should be a practical tips or summary section${keywordInstruction}

Write the complete article now:`;
};

/**
 * POST /api/content/generate
 * Generate content with configurable tone, word count, and keywords
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cityName,
      question,
      contentDirection,
      tone = "conversational",
      wordCount = 500,
      keywords = []
    } = body;

    if (!question || !cityName) {
      return NextResponse.json({ error: "question and cityName required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const prompt = buildPrompt(
      cityName,
      question,
      contentDirection,
      tone,
      wordCount,
      keywords
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
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
    const actualWordCount = answer.split(/\s+/).length;

    return NextResponse.json({
      success: true,
      answer,
      wordCount: actualWordCount,
    });
  } catch (error) {
    console.error("PAA generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
