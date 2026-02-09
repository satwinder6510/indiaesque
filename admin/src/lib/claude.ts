import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

export interface ResearchResult {
  pages: ResearchPage[];
  categories: ResearchCategory[];
  notes: string;
}

export interface ResearchPage {
  id: string;
  type: "hub" | "category" | "paa";
  category: string;
  title: string;
  slug: string;
  contentDirection: string;
}

export interface ResearchCategory {
  id: string;
  name: string;
  slug: string;
  hasCategoryPage: boolean;
  categoryPageTitle?: string;
}

export interface GenerationResult {
  frontmatter: Record<string, unknown>;
  content: string;
  wordCount: number;
}

/**
 * Research PAA questions for a city using web search
 */
export async function researchCity(
  cityName: string,
  citySlug: string,
  seedQueries: string[]
): Promise<ResearchResult> {
  const prompt = buildResearchPrompt(cityName, citySlug, seedQueries);

  // Use agentic loop to handle tool use
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let iterations = 0;
  const maxIterations = 20; // Prevent infinite loops

  while (iterations < maxIterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        } as unknown as Anthropic.Tool,
      ],
      messages,
    });

    // If Claude is done (end_turn), extract text from THIS response only
    if (response.stop_reason === "end_turn") {
      let finalText = "";
      for (const block of response.content) {
        if (block.type === "text") {
          finalText += block.text;
        }
      }

      if (!finalText) {
        throw new Error("No text content in final response");
      }

      // Parse the JSON response
      return parseResearchJSON(finalText);
    }

    // If Claude wants to use tools, add this response and continue
    if (response.stop_reason === "tool_use") {
      // Add assistant's response to messages
      messages.push({ role: "assistant", content: response.content });

      // For built-in tools like web_search, we don't need to provide results
      // Just add an empty user turn to continue
      messages.push({
        role: "user",
        content: "Please continue with your research and provide the final JSON output."
      });
    } else {
      // Unknown stop reason, break
      break;
    }
  }

  throw new Error("Research did not complete within maximum iterations");
}

/**
 * Parse JSON from research response text
 */
function parseResearchJSON(text: string): ResearchResult {
  // Try various JSON block patterns
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,      // Standard markdown JSON block
    /```\s*([\s\S]*?)\s*```/,           // Code block without language
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  // Try to find a JSON object with "pages" key
  const pagesMatch = text.match(/\{[\s\S]*"pages"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (pagesMatch) {
    try {
      return JSON.parse(pagesMatch[0]);
    } catch {
      // Continue to next attempt
    }
  }

  // Last resort: try to find and parse any JSON object
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      // Fall through to error
    }
  }

  throw new Error(`Could not parse research response as JSON. Response started with: ${text.slice(0, 200)}...`);
}

/**
 * Generate content for a single page
 */
export async function generatePage(
  pageSpec: {
    type: "hub" | "category" | "paa";
    title: string;
    slug: string;
    contentDirection: string;
    category: string;
  },
  cityName: string,
  citySlug: string,
  allPages: { title: string; slug: string }[],
  bannedPhrases: string[]
): Promise<GenerationResult> {
  const prompt = buildGenerationPrompt(
    pageSpec,
    cityName,
    citySlug,
    allPages,
    bannedPhrases
  );

  // Hub pages need more tokens for 2,500-3,000 word content
  const maxTokens = pageSpec.type === "hub" ? 8000 : pageSpec.type === "category" ? 6000 : 4000;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response");
  }

  return parseGeneratedContent(textContent.text);
}

/**
 * Build the research prompt for PAA discovery
 */
function buildResearchPrompt(
  cityName: string,
  citySlug: string,
  seedQueries: string[]
): string {
  return `You are researching travel content for ${cityName}, India. Your task is to discover the questions travellers ask about ${cityName} and create a comprehensive content plan.

## Instructions

1. Use web search to find real questions people ask about ${cityName}
2. Search for each of these seed queries and extract PAA-style questions from results:
${seedQueries.map((q) => `   - "${q}"`).join("\n")}

3. Also include these generic India travel questions adapted for ${cityName}:
   - Is ${cityName} safe for tourists?
   - How many days do you need in ${cityName}?
   - What is ${cityName} famous for?
   - Best time to visit ${cityName}
   - Where to stay in ${cityName}
   - Getting around ${cityName}
   - ${cityName} travel tips

4. Categorise all discovered questions into these 9 categories:
   - general (city-wide questions, safety, planning)
   - food (food tours, restaurants, street food, cuisine)
   - heritage (heritage walks, historical sites, architecture)
   - markets (shopping, bazaars, markets)
   - culture (art, craft workshops, cultural experiences)
   - nature (day trips, parks, outdoor activities)
   - spiritual (temples, religious sites, spiritual experiences)
   - nightlife (bars, clubs, entertainment)
   - practical (transport, visa, money, connectivity)

5. For each question, write a content direction brief (1-2 sentences) that includes:
   - Specific place names, streets, or neighbourhoods
   - Price ranges in INR
   - Distances or travel times
   - Unique ${cityName}-specific details

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "pages": [
    {
      "id": "${citySlug}-hub",
      "type": "hub",
      "category": "general",
      "title": "Things To Do In ${cityName} — 2026 Guide",
      "slug": "_index",
      "contentDirection": "Comprehensive hub linking to all categories. Cover top experiences, practical info, and FAQ section. 2,500-3,000 words."
    },
    {
      "id": "${citySlug}-food-cat",
      "type": "category",
      "category": "food",
      "title": "Best Food Tours In ${cityName} — 2026 Guide",
      "slug": "food-tours",
      "contentDirection": "Overview of food tour options, street food areas, price ranges. Include specific operator recommendations."
    },
    {
      "id": "${citySlug}-is-safe",
      "type": "paa",
      "category": "general",
      "title": "Is ${cityName} Safe For Tourists?",
      "slug": "is-${citySlug}-safe-for-tourists",
      "contentDirection": "Answer directly in first paragraph. Cover safety by area, common scams specific to ${cityName}, transport safety tips."
    }
  ],
  "categories": [
    {
      "id": "food",
      "name": "${cityName} Food & Drink",
      "slug": "food",
      "hasCategoryPage": true,
      "categoryPageTitle": "Best Food Tours In ${cityName} — 2026 Guide"
    }
  ],
  "notes": "${cityName}-specific notes: key differentiators, things to avoid, unique experiences, cultural considerations."
}
\`\`\`

## Rules

- Deduplicate similar questions (keep the most search-friendly version)
- Title format: Question for PAA pages, "Best X In ${cityName}" for category pages
- Slugs: lowercase, hyphens, no special characters
- Target 80-120 PAA pages per city
- Every page must have a specific, actionable content direction
- Include at least one category page per category that has 3+ PAA questions

Now search and compile the content plan for ${cityName}.`;
}

/**
 * Build the generation prompt for a single page
 */
function buildGenerationPrompt(
  pageSpec: {
    type: "hub" | "category" | "paa";
    title: string;
    slug: string;
    contentDirection: string;
    category: string;
  },
  cityName: string,
  citySlug: string,
  allPages: { title: string; slug: string }[],
  bannedPhrases: string[]
): string {
  const wordCountTargets = {
    hub: "2,500-3,000",
    category: "1,500-2,000",
    paa: "600-1,200",
  };

  const relatedPages = allPages
    .filter((p) => p.slug !== pageSpec.slug)
    .slice(0, 10)
    .map((p) => `- /${citySlug}/${p.slug}/ — ${p.title}`)
    .join("\n");

  const bannedList = bannedPhrases.map((p) => `- "${p}"`).join("\n");

  const today = new Date().toISOString().split("T")[0];

  return `You are writing travel content for ${cityName}, India.

## Page to Generate

- **Type**: ${pageSpec.type}
- **Title**: ${pageSpec.title}
- **URL**: /${citySlug}/${pageSpec.slug}/
- **Category**: ${pageSpec.category}
- **Content Direction**: ${pageSpec.contentDirection}
- **Target Word Count**: ${wordCountTargets[pageSpec.type]} words

## Available Pages for Internal Linking

${relatedPages}

## Brand Voice

- Write like a knowledgeable local friend, not a corporate travel guide
- Use "you" freely
- Be direct and state facts — don't hedge with "might" or "could be"
- Include specific prices in INR with USD conversion (e.g., "₹2,500 ($30)")
- Name specific places, streets, metro stations
- No fluff or filler content

## Banned Phrases (never use these)

${bannedList}

## Output Format

Return the content in this exact format:

---FRONTMATTER---
title: "${pageSpec.title}"
description: "[120-155 character meta description]"
city: ${citySlug}
category: ${pageSpec.category}
type: ${pageSpec.type}
datePublished: ${today}
dateModified: ${today}
status: machine-draft
schema:
  - Article
  - BreadcrumbList${pageSpec.type !== "hub" ? "" : "\n  - TouristDestination"}
  - FAQPage
relatedPages:
  - /${citySlug}/
  [add 3-5 related page URLs from the list above]
parentPage: ${pageSpec.type === "hub" ? "/" : `/${citySlug}/`}
faq:
  - question: "[Related question 1]"
    answer: "[50-100 word answer]"
  - question: "[Related question 2]"
    answer: "[50-100 word answer]"
  - question: "[Related question 3]"
    answer: "[50-100 word answer]"
---FRONTMATTER---

---CONTENT---
${pageSpec.type === "paa" ? "**[Direct answer to the question in first 50 words, bolded]**\n\n" : ""}[Main content with h2 headings, internal links, specific details...]

## [Section Heading]

[Content...]

## Frequently Asked Questions

[FAQ section matching the frontmatter FAQ entries]
---CONTENT---

## Critical Rules

1. First paragraph of PAA pages must directly answer the question
2. Include at least 3 internal links in the body text using markdown format [anchor text](url)
3. Meta description must be 120-155 characters
4. Title must be under 60 characters
5. Include specific prices, durations, and locations
6. FAQ answers in frontmatter must match content in the FAQ section

Now generate the content.`;
}

/**
 * Parse generated content into frontmatter and body
 */
function parseGeneratedContent(text: string): GenerationResult {
  // Extract frontmatter
  const frontmatterMatch = text.match(
    /---FRONTMATTER---\n([\s\S]*?)\n---FRONTMATTER---/
  );
  if (!frontmatterMatch) {
    throw new Error("Could not find frontmatter in generated content");
  }

  // Extract content
  const contentMatch = text.match(/---CONTENT---\n([\s\S]*?)\n---CONTENT---/);
  if (!contentMatch) {
    throw new Error("Could not find content in generated content");
  }

  // Parse YAML frontmatter manually (simple key-value parsing)
  const frontmatterLines = frontmatterMatch[1].split("\n");
  const frontmatter: Record<string, unknown> = {};
  let currentKey = "";
  let currentArray: string[] | { question: string; answer: string }[] = [];
  let inArray = false;
  let inFaq = false;
  let currentFaqItem: { question: string; answer: string } | null = null;

  for (const line of frontmatterLines) {
    const trimmed = line.trim();

    // Check for array item
    if (trimmed.startsWith("- ") && inArray && !inFaq) {
      (currentArray as string[]).push(trimmed.slice(2).trim());
      continue;
    }

    // Check for FAQ item
    if (inFaq) {
      if (trimmed.startsWith("- question:")) {
        if (currentFaqItem) {
          (currentArray as { question: string; answer: string }[]).push(
            currentFaqItem
          );
        }
        currentFaqItem = {
          question: trimmed.slice(12).trim().replace(/^["']|["']$/g, ""),
          answer: "",
        };
      } else if (trimmed.startsWith("answer:") && currentFaqItem) {
        currentFaqItem.answer = trimmed
          .slice(7)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
      continue;
    }

    // Check for key
    const keyMatch = trimmed.match(/^(\w+):\s*(.*)?$/);
    if (keyMatch) {
      // Save previous array if any
      if (inArray && currentKey) {
        frontmatter[currentKey] = currentArray;
      }

      currentKey = keyMatch[1];
      const value = keyMatch[2]?.trim();

      if (value === "" || value === undefined) {
        // Start of array
        inArray = true;
        inFaq = currentKey === "faq";
        currentArray = [];
        currentFaqItem = null;
      } else {
        inArray = false;
        inFaq = false;
        // Clean up quoted strings
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  // Save last array
  if (inArray && currentKey) {
    if (inFaq && currentFaqItem) {
      (currentArray as { question: string; answer: string }[]).push(
        currentFaqItem
      );
    }
    frontmatter[currentKey] = currentArray;
  }

  const content = contentMatch[1].trim();
  const wordCount = content.split(/\s+/).length;

  return {
    frontmatter,
    content,
    wordCount,
  };
}

/**
 * Assemble frontmatter and content into a Markdown file
 */
export function assembleMarkdown(result: GenerationResult): string {
  const yamlLines: string[] = ["---"];

  for (const [key, value] of Object.entries(result.frontmatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}:`);
      if (
        value.length > 0 &&
        typeof value[0] === "object" &&
        "question" in value[0]
      ) {
        // FAQ array
        for (const item of value as { question: string; answer: string }[]) {
          yamlLines.push(`  - question: "${item.question}"`);
          yamlLines.push(`    answer: "${item.answer}"`);
        }
      } else {
        // String array
        for (const item of value as string[]) {
          yamlLines.push(`  - ${item}`);
        }
      }
    } else {
      yamlLines.push(`${key}: "${value}"`);
    }
  }

  yamlLines.push("---");
  yamlLines.push("");
  yamlLines.push(result.content);

  return yamlLines.join("\n");
}
