import Anthropic from '@anthropic-ai/sdk';
import * as fileManager from './file-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 5000) {
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

      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited. Waiting ${delay/1000}s before retry ${attempt + 2}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Load banned phrases from JSON
let BANNED_PHRASES_CACHE = null;

async function loadBannedPhrases() {
  if (BANNED_PHRASES_CACHE) return BANNED_PHRASES_CACHE;

  try {
    const phrasesPath = path.join(__dirname, '..', '..', '..', 'data', 'banned-phrases.json');
    const data = await fs.readFile(phrasesPath, 'utf-8');
    const phrasesData = JSON.parse(data);

    // Flatten all phrases into a single array
    const allPhrases = [];
    for (const [category, categoryData] of Object.entries(phrasesData.categories)) {
      allPhrases.push(...categoryData.phrases);
    }

    BANNED_PHRASES_CACHE = {
      flat: allPhrases,
      categorized: phrasesData.categories
    };

    return BANNED_PHRASES_CACHE;
  } catch (err) {
    console.error('Failed to load banned-phrases.json:', err.message);
    // Fallback to basic list
    return {
      flat: [
        'in conclusion', "it's worth noting", 'delve into', 'vibrant tapestry',
        'bustling metropolis', 'hidden gem', 'rich tapestry', 'feast for the senses',
        'must-visit', 'embark on a journey', 'immerse yourself', 'plethora of',
        'myriad of', 'unparalleled', 'breathtaking', 'unforgettable experience'
      ],
      categorized: {}
    };
  }
}

// Format banned phrases for prompt injection (grouped by category for clarity)
async function formatBannedPhrasesForPrompt() {
  const phrases = await loadBannedPhrases();

  if (Object.keys(phrases.categorized).length === 0) {
    return phrases.flat.join(', ');
  }

  let formatted = '';
  for (const [category, data] of Object.entries(phrases.categorized)) {
    const categoryName = category.replace(/_/g, ' ').toUpperCase();
    formatted += `\n**${categoryName}:** ${data.phrases.slice(0, 8).join(', ')}${data.phrases.length > 8 ? '...' : ''}`;
  }

  return formatted;
}

async function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.md`);
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to load template ${templateName}:`, err.message);
    return null;
  }
}

async function buildPrompt(page, contentBank, cities, categories, templateContent) {
  const cityInfo = cities.find(c => c.slug === contentBank.city);
  const cityName = cityInfo?.name || contentBank.cityName;

  // Get related pages for internal linking
  const relatedPages = contentBank.pages
    .filter(p => p.category === page.category && p.id !== page.id)
    .slice(0, 10)
    .map(p => ({ title: p.title, slug: `/${contentBank.city}/${p.slug}/` }));

  // Get category pages
  const categoryPages = contentBank.pages
    .filter(p => p.type === 'category')
    .map(p => ({ title: p.title, slug: `/${contentBank.city}/${p.slug}/` }));

  // Get formatted banned phrases
  const bannedPhrasesFormatted = await formatBannedPhrasesForPrompt();

  // Build context
  let prompt = templateContent
    .replace(/\{\{cityName\}\}/g, cityName)
    .replace(/\{\{citySlug\}\}/g, contentBank.city)
    .replace(/\{\{pageTitle\}\}/g, page.title)
    .replace(/\{\{pageSlug\}\}/g, page.slug)
    .replace(/\{\{pageType\}\}/g, page.type)
    .replace(/\{\{category\}\}/g, page.category)
    .replace(/\{\{contentDirection\}\}/g, page.contentDirection || 'No specific direction provided')
    .replace(/\{\{cityDescription\}\}/g, cityInfo?.description || '')
    .replace(/\{\{relatedPages\}\}/g, JSON.stringify(relatedPages, null, 2))
    .replace(/\{\{categoryPages\}\}/g, JSON.stringify(categoryPages, null, 2))
    .replace(/\{\{bannedPhrases\}\}/g, bannedPhrasesFormatted);

  return prompt;
}

function parseGeneratedContent(text) {
  // Try to extract frontmatter and content
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    const content = frontmatterMatch[2].trim();

    // Parse YAML frontmatter manually (simple key: value pairs)
    const frontmatter = {};
    const lines = frontmatterText.split('\n');
    let currentKey = null;
    let currentValue = [];
    let inArray = false;

    for (const line of lines) {
      const keyMatch = line.match(/^(\w+):\s*(.*)$/);

      if (keyMatch && !inArray) {
        if (currentKey) {
          frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue;
        }
        currentKey = keyMatch[1];
        const value = keyMatch[2].trim();

        if (value === '' || value === '|') {
          currentValue = [];
          inArray = value !== '|';
        } else if (value.startsWith('[') || value.startsWith('"')) {
          try {
            frontmatter[currentKey] = JSON.parse(value);
            currentKey = null;
            currentValue = [];
          } catch {
            currentValue = [value.replace(/^["']|["']$/g, '')];
          }
        } else {
          currentValue = [value.replace(/^["']|["']$/g, '')];
        }
      } else if (line.startsWith('  - ')) {
        inArray = true;
        currentValue.push(line.substring(4).trim().replace(/^["']|["']$/g, ''));
      } else if (line.startsWith('    ')) {
        // Continuation of multiline value
        if (currentValue.length > 0) {
          currentValue[currentValue.length - 1] += '\n' + line.trim();
        }
      } else if (line.trim() === '') {
        inArray = false;
      }
    }

    if (currentKey) {
      frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue;
    }

    return { frontmatter, content };
  }

  // Fallback: return as-is with minimal frontmatter
  return {
    frontmatter: {},
    content: text
  };
}

export async function generator(options, onEvent) {
  const { city, pageIds } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }

  const client = new Anthropic();

  // Load data
  const contentBank = await fileManager.getContentBank(city);
  if (!contentBank) {
    throw new Error(`Content bank not found for ${city}`);
  }

  const cities = await fileManager.getCities();
  const categories = await fileManager.getCategories();

  // Load templates
  const templates = {
    hub: await loadTemplate('hub-prompt'),
    category: await loadTemplate('category-prompt'),
    paa: await loadTemplate('paa-prompt')
  };

  // Get pages to generate
  const pagesToGenerate = pageIds
    ? contentBank.pages.filter(p => pageIds.includes(p.id))
    : contentBank.pages.filter(p => p.status === 'not-started');

  onEvent({ log: `Starting generation for ${pagesToGenerate.length} pages...`, type: 'info' });

  let generatedCount = 0;

  // Generate pages sequentially (to avoid rate limits and ensure quality)
  for (const page of pagesToGenerate) {
    onEvent({ log: `Generating: ${page.title}`, type: 'info' });

    const templateContent = templates[page.type];
    if (!templateContent) {
      onEvent({ log: `No template for type: ${page.type}, skipping`, type: 'warning' });
      continue;
    }

    const prompt = await buildPrompt(page, contentBank, cities, categories, templateContent);

    try {
      onEvent({ log: `Calling API (with retry)...`, type: 'info' });

      const response = await retryWithBackoff(async () => {
        return await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
      }, 5, 10000); // 5 retries, starting at 10 second delay

      // Extract text content
      let resultText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          resultText += block.text;
        }
      }

      // Parse the generated content
      const { frontmatter, content } = parseGeneratedContent(resultText);

      // Merge with required frontmatter
      const finalFrontmatter = {
        title: page.title,
        description: frontmatter.description || '',
        city: contentBank.city,
        category: page.category,
        type: page.type,
        datePublished: new Date().toISOString().split('T')[0],
        dateModified: new Date().toISOString().split('T')[0],
        status: 'machine-draft',
        schema: frontmatter.schema || ['Article', 'BreadcrumbList'],
        relatedPages: frontmatter.relatedPages || [],
        parentPage: `/${contentBank.city}/`,
        faq: frontmatter.faq || [],
        ...frontmatter
      };

      // Write content file
      const slug = page.slug === '_index' ? '_index' : page.slug;
      await fileManager.writeContentFile(contentBank.city, slug, finalFrontmatter, content);

      // If this is a hub page, also update hub.json's generatedContent
      if (page.type === 'hub' || page.slug === '_index') {
        await fileManager.updateHubContent(contentBank.city, content);
        onEvent({ log: `Updated hub.json for ${contentBank.city}`, type: 'success' });
      }

      // Update content bank
      const pageIndex = contentBank.pages.findIndex(p => p.id === page.id);
      if (pageIndex !== -1) {
        contentBank.pages[pageIndex].status = 'generated';
        contentBank.pages[pageIndex].wordCount = content.split(/\s+/).length;
        contentBank.pages[pageIndex].generatedAt = new Date().toISOString();
      }

      generatedCount++;
      onEvent({ log: `Generated: ${page.title} (${content.split(/\s+/).length} words)`, type: 'success' });

      // Delay to avoid rate limiting (5 seconds between requests)
      onEvent({ log: `Waiting 5s before next request...`, type: 'info' });
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (err) {
      onEvent({ log: `Failed to generate ${page.title}: ${err.message}`, type: 'error' });

      // Update content bank with error
      const pageIndex = contentBank.pages.findIndex(p => p.id === page.id);
      if (pageIndex !== -1) {
        contentBank.pages[pageIndex].status = 'error';
        contentBank.pages[pageIndex].validationErrors = [err.message];
      }
    }
  }

  // Save updated content bank
  await fileManager.saveContentBank(city, contentBank);

  onEvent({ log: `Generation complete: ${generatedCount}/${pagesToGenerate.length} pages`, type: 'success' });

  return { generatedCount, total: pagesToGenerate.length };
}
