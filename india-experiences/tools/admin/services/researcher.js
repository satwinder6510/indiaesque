import Anthropic from '@anthropic-ai/sdk';
import * as fileManager from './file-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retry helper with exponential backoff
async function retryWithBackoff(fn, onEvent, maxRetries = 5, baseDelay = 10000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429 ||
                          err.message?.includes('rate') ||
                          err.message?.includes('Rate') ||
                          err.message?.includes('overloaded');

      if (!isRateLimit || attempt === maxRetries - 1) {
        throw err;
      }

      // Exponential backoff: 10s, 20s, 40s, 80s, 160s
      const delay = baseDelay * Math.pow(2, attempt);
      onEvent({ log: `Rate limited. Waiting ${delay/1000}s before retry ${attempt + 2}/${maxRetries}...`, type: 'warning' });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Load research prompt template
async function loadPromptTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'research-prompt.md');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error('Failed to load research prompt template:', err);
    return getDefaultPrompt();
  }
}

function getDefaultPrompt() {
  return `You are a travel content researcher for Indiaesque, a site about experiences in India.

Your task is to research "People Also Ask" (PAA) questions for {{cityName}} that tourists commonly search for.

## Research Goals
1. Discover what questions tourists ask about {{cityName}}
2. Categorize questions into experience categories
3. Write brief content direction notes for each question

## Categories to Research
- General Travel (itineraries, timing, costs, safety)
- Food & Drink (restaurants, street food, food tours)
- Heritage & History (monuments, museums, history)
- Markets & Shopping (what to buy, where to shop)
- Day Trips (nearby destinations)
- Experiences & Activities (classes, tours, nightlife)
- Practical & Transport (metro, SIM, scams)
- Neighbourhoods (area guides)
- Festivals & Seasonal (events, celebrations)

## Search Queries to Use
- "things to do in {{cityName}}"
- "{{cityName}} travel tips"
- "{{cityName}} food guide"
- "is {{cityName}} safe"
- "how many days in {{cityName}}"
- "{{cityName}} itinerary"
- "best time to visit {{cityName}}"
- "{{cityName}} street food"
- "{{cityName}} heritage sites"

## Output Format
Return a JSON object with discovered PAA questions:

{
  "questions": [
    {
      "question": "The actual question tourists ask",
      "category": "category-slug",
      "contentDirection": "Brief 1-2 sentence guide on how to answer this"
    }
  ]
}

Focus on questions that indicate purchase intent or trip planning intent. Avoid generic questions.`;
}

export async function researcher(options, onEvent) {
  const { city } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }

  const client = new Anthropic();

  // Get city info
  const cities = await fileManager.getCities();
  const cityInfo = cities.find(c => c.slug === city);
  const cityName = cityInfo?.name || city.charAt(0).toUpperCase() + city.slice(1);

  onEvent({ log: `Starting research for ${cityName}...`, type: 'info' });

  // Load and populate template
  let promptTemplate = await loadPromptTemplate();
  promptTemplate = promptTemplate.replace(/\{\{cityName\}\}/g, cityName);
  promptTemplate = promptTemplate.replace(/\{\{citySlug\}\}/g, city);

  onEvent({ log: 'Loaded research prompt template', type: 'info' });

  // Run research with web search tool
  try {
    onEvent({ log: 'Calling Claude with web search (with retry)...', type: 'info' });

    const response = await retryWithBackoff(async () => {
      return await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 10
          }
        ],
        messages: [
          {
            role: 'user',
            content: promptTemplate
          }
        ]
      });
    }, onEvent, 5, 15000); // 5 retries, starting at 15 second delay

    onEvent({ log: 'Received response from Claude', type: 'success' });

    // Extract the text content and parse JSON
    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text;
      }
    }

    // Try to extract JSON from the response
    let questions = [];
    try {
      // Look for JSON in the response
      const jsonMatch = resultText.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || [];
      }
    } catch (parseErr) {
      onEvent({ log: `JSON parsing note: ${parseErr.message}`, type: 'warning' });
      // Return empty if we can't parse
    }

    onEvent({ log: `Discovered ${questions.length} questions`, type: 'info' });

    // Get or create content bank
    let contentBank = await fileManager.getContentBank(city);
    if (!contentBank) {
      contentBank = {
        city: city,
        cityName: cityName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categories: [],
        pages: [],
        notes: ''
      };
    }

    // Add new questions to content bank
    let addedCount = 0;
    for (const q of questions) {
      // Check if question already exists
      const exists = contentBank.pages.some(
        p => p.title.toLowerCase() === q.question.toLowerCase()
      );

      if (!exists) {
        const slug = q.question
          .toLowerCase()
          .replace(/[?]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        contentBank.pages.push({
          id: `${city}-research-${Date.now()}-${addedCount}`,
          type: 'paa',
          category: q.category || 'general',
          title: q.question,
          slug: slug,
          contentDirection: q.contentDirection || '',
          status: 'not-started',
          wordCount: null,
          generatedAt: null,
          validationErrors: []
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await fileManager.saveContentBank(city, contentBank);
      onEvent({ log: `Added ${addedCount} new pages to content bank`, type: 'success' });
    } else {
      onEvent({ log: 'No new unique questions to add', type: 'info' });
    }

    return { questions, addedCount };

  } catch (err) {
    onEvent({ log: `Research error: ${err.message}`, type: 'error' });
    throw err;
  }
}
