import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readJSON, writeJSON } from "@/lib/github";
import type { CityHub, PAAQuestion } from "../route";
import { buildGeneratePrompt, buildExpandPrompt } from "@/lib/promptBuilder";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CONTENT_BASE = "india-experiences/src/data/content";

/**
 * Generate unique ID for PAA question
 */
function generateQuestionId(): string {
  return `paa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * POST /api/content/research
 * Research PAA questions for a city and generate SEO-optimized hub content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityName, citySlug, action } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    if (action === "research") {
      if (!cityName) {
        return NextResponse.json({ error: "cityName is required" }, { status: 400 });
      }

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

      // Add IDs and timestamps to questions
      const timestamp = new Date().toISOString();
      const questionsWithIds = paaData.questions.map((q: { question: string; category: string; searchVolume: string }) => ({
        id: generateQuestionId(),
        question: q.question,
        category: q.category,
        searchVolume: q.searchVolume as "high" | "medium" | "low",
        selected: true,
        researchedAt: timestamp,
      }));

      return NextResponse.json({ success: true, questions: questionsWithIds });
    }

    if (action === "save") {
      // Persist PAA questions to hub
      if (!citySlug) {
        return NextResponse.json({ error: "citySlug is required" }, { status: 400 });
      }

      const { questions } = body;
      if (!questions || !Array.isArray(questions)) {
        return NextResponse.json({ error: "questions array is required" }, { status: 400 });
      }

      const hubPath = `${CONTENT_BASE}/${citySlug}/hub.json`;
      const hub = await readJSON<CityHub>(hubPath);

      if (!hub) {
        return NextResponse.json({ error: "City hub not found" }, { status: 404 });
      }

      hub.paaResearch = {
        questions: questions as PAAQuestion[],
        lastResearchedAt: new Date().toISOString(),
      };
      hub.updatedAt = new Date().toISOString();

      await writeJSON(hubPath, hub, `feat(content): save PAA research for ${hub.name} [admin]`);

      return NextResponse.json({ success: true, hub });
    }

    if (action === "bulk-research") {
      // Research multiple cities at once
      const { cities } = body;
      if (!cities || !Array.isArray(cities) || cities.length === 0) {
        return NextResponse.json({ error: "cities array is required" }, { status: 400 });
      }

      const results: { citySlug: string; cityName: string; success: boolean; error?: string; questionCount?: number }[] = [];

      for (const city of cities) {
        try {
          const { slug, name } = city;

          // Research PAA questions
          const paaPrompt = `You are an SEO expert researching "People Also Ask" questions for travel content.

For the city "${name}" in India, generate 15-20 realistic PAA questions that travelers commonly search for.

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

Make questions specific to ${name} and realistic - the kind that appear in Google's PAA boxes.`;

          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [{ role: "user", content: paaPrompt }],
          });

          const content = message.content[0];
          if (content.type !== "text") throw new Error("Unexpected response");

          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("Failed to parse PAA response");

          const paaData = JSON.parse(jsonMatch[0]);

          // Add IDs and timestamps
          const timestamp = new Date().toISOString();
          const questionsWithIds: PAAQuestion[] = paaData.questions.map((q: { question: string; category: string; searchVolume: string }) => ({
            id: generateQuestionId(),
            question: q.question,
            category: q.category,
            searchVolume: q.searchVolume as "high" | "medium" | "low",
            selected: true,
            researchedAt: timestamp,
          }));

          // Save to hub
          const hubPath = `${CONTENT_BASE}/${slug}/hub.json`;
          const hub = await readJSON<CityHub>(hubPath);

          if (hub) {
            hub.paaResearch = {
              questions: questionsWithIds,
              lastResearchedAt: timestamp,
            };
            hub.updatedAt = timestamp;

            await writeJSON(hubPath, hub, `feat(content): bulk PAA research for ${name} [admin]`);
            results.push({ citySlug: slug, cityName: name, success: true, questionCount: questionsWithIds.length });
          } else {
            results.push({ citySlug: slug, cityName: name, success: false, error: "Hub not found" });
          }
        } catch (err) {
          results.push({
            citySlug: city.slug,
            cityName: city.name,
            success: false,
            error: err instanceof Error ? err.message : "Research failed"
          });
        }
      }

      return NextResponse.json({ success: true, results });
    }

    if (action === "generate") {
      if (!cityName) {
        return NextResponse.json({ error: "cityName is required" }, { status: 400 });
      }

      const {
        questions,
        tone = "professional",
        wordCount: targetWordCount = 3500,
        keywords = [],
        facts = []
      } = body;

      if (!questions || questions.length === 0) {
        return NextResponse.json({ error: "questions are required" }, { status: 400 });
      }

      const generatePrompt = buildGeneratePrompt({
        cityName,
        tone,
        wordCount: targetWordCount,
        keywords,
        questions,
        facts,
      });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: generatePrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Unexpected response");

      const hubContent = content.text.trim();
      const actualWordCount = hubContent.split(/\s+/).length;

      return NextResponse.json({
        success: true,
        content: hubContent,
        wordCount: actualWordCount,
        generationConfig: {
          tone,
          wordCount: targetWordCount,
          keywords,
          paaQuestionIds: questions.map((q: { id?: string }) => q.id).filter(Boolean),
        },
      });
    }

    if (action === "expand") {
      if (!cityName) {
        return NextResponse.json({ error: "cityName is required" }, { status: 400 });
      }

      const {
        existingContent,
        expandDirection,
        tone = "professional",
        wordCount: targetAdditionalWords = 500,
        keywords = [],
      } = body;

      if (!existingContent || !expandDirection) {
        return NextResponse.json(
          { error: "existingContent and expandDirection are required" },
          { status: 400 }
        );
      }

      const expandPrompt = buildExpandPrompt({
        cityName,
        existingContent,
        expandDirection,
        tone,
        targetAdditionalWords,
        keywords,
      });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        messages: [{ role: "user", content: expandPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Unexpected response");

      const expandedContent = content.text.trim();
      const actualWordCount = expandedContent.split(/\s+/).length;

      return NextResponse.json({
        success: true,
        content: expandedContent,
        wordCount: actualWordCount,
        generationConfig: {
          tone,
          wordCount: targetAdditionalWords,
          keywords,
          paaQuestionIds: [],
          expandDirection,
        },
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
