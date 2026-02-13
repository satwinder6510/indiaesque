#!/usr/bin/env node
/**
 * Add tags to all pages based on category and title keywords
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

// Category to base tags mapping
const CATEGORY_TAGS = {
  'general': ['overview', 'first-time'],
  'practical': ['practical', 'planning'],
  'heritage': ['heritage', 'history', 'monuments'],
  'food': ['food', 'where-to-eat'],
  'experiences': ['experiences', 'activities'],
  'markets': ['markets', 'shopping'],
  'festival': ['festivals', 'culture', 'events'],
  'daytrips': ['day-trips', 'excursions'],
  'day-trips': ['day-trips', 'excursions'],
  'neighbourhood': ['neighbourhoods', 'areas'],
  'neighbourhoods': ['neighbourhoods', 'areas'],
  'nightlife': ['nightlife', 'bars', 'entertainment'],
  'shopping': ['shopping', 'markets'],
  'culture': ['culture', 'heritage'],
  'activities': ['activities', 'things-to-do'],
  'transport': ['transport', 'getting-around'],
  'wellness': ['wellness', 'health'],
  'nature': ['nature', 'outdoors'],
  'spiritual': ['spiritual', 'temples', 'religious'],
};

// Title keyword to tags mapping
const KEYWORD_TAGS = {
  'street food': ['street-food', 'local-food'],
  'street-food': ['street-food', 'local-food'],
  'biryani': ['biryani', 'local-food', 'restaurants'],
  'butter chicken': ['local-food', 'restaurants'],
  'cafe': ['cafes', 'coffee'],
  'coffee': ['cafes', 'coffee'],
  'bar': ['bars', 'nightlife', 'drinks'],
  'beer': ['bars', 'craft-beer', 'drinks'],
  'cocktail': ['bars', 'cocktails', 'drinks'],
  'rooftop': ['rooftop', 'views'],
  'temple': ['temples', 'spiritual', 'religious'],
  'mosque': ['mosques', 'religious', 'heritage'],
  'church': ['churches', 'religious'],
  'gurudwara': ['gurudwara', 'sikh', 'religious'],
  'tomb': ['tombs', 'heritage', 'mughal'],
  'fort': ['forts', 'heritage', 'history'],
  'palace': ['palaces', 'heritage', 'royalty'],
  'museum': ['museums', 'history', 'culture'],
  'gallery': ['galleries', 'art', 'culture'],
  'art': ['art', 'culture'],
  'walk': ['walks', 'tours', 'activities'],
  'tour': ['tours', 'activities'],
  'market': ['markets', 'shopping'],
  'bazaar': ['markets', 'shopping', 'old-city'],
  'mall': ['malls', 'shopping'],
  'spa': ['spa', 'wellness', 'relaxation'],
  'yoga': ['yoga', 'wellness'],
  'ayurveda': ['ayurveda', 'wellness'],
  'metro': ['metro', 'transport'],
  'airport': ['airport', 'transport', 'arrival'],
  'taxi': ['taxi', 'transport'],
  'uber': ['uber', 'transport', 'apps'],
  'hotel': ['hotels', 'accommodation'],
  'stay': ['accommodation', 'hotels'],
  'hostel': ['hostels', 'budget'],
  'boutique': ['boutique-hotels', 'luxury'],
  'luxury': ['luxury', 'upscale'],
  'budget': ['budget', 'affordable'],
  'safe': ['safety', 'practical'],
  'scam': ['scams', 'safety'],
  'avoid': ['safety', 'tips'],
  'weather': ['weather', 'climate', 'seasons'],
  'monsoon': ['monsoon', 'weather', 'seasons'],
  'winter': ['winter', 'weather', 'seasons'],
  'summer': ['summer', 'weather', 'seasons'],
  'holi': ['holi', 'festivals'],
  'diwali': ['diwali', 'festivals'],
  'eid': ['eid', 'festivals'],
  'republic day': ['republic-day', 'festivals'],
  'independence': ['independence-day', 'festivals'],
  'photography': ['photography', 'instagram'],
  'instagram': ['instagram', 'photography'],
  'sunset': ['sunset', 'views'],
  'sunrise': ['sunrise', 'views'],
  'night': ['nightlife', 'after-dark'],
  'music': ['music', 'entertainment'],
  'sufi': ['sufi', 'music', 'spiritual'],
  'jazz': ['jazz', 'music'],
  'live music': ['live-music', 'entertainment'],
  'dance': ['dance', 'entertainment'],
  'cooking': ['cooking', 'food', 'classes'],
  'class': ['classes', 'activities'],
  'workshop': ['workshops', 'activities'],
  'old delhi': ['old-delhi', 'chandni-chowk'],
  'chandni chowk': ['chandni-chowk', 'old-delhi'],
  'connaught': ['connaught-place', 'central-delhi'],
  'hauz khas': ['hauz-khas', 'south-delhi'],
  'south delhi': ['south-delhi'],
  'new delhi': ['new-delhi', 'lutyens'],
  'mughal': ['mughal', 'heritage', 'history'],
  'british': ['british', 'colonial', 'history'],
  'unesco': ['unesco', 'world-heritage'],
  'heritage': ['heritage', 'history'],
  'monument': ['monuments', 'heritage'],
  'park': ['parks', 'nature', 'outdoors'],
  'garden': ['gardens', 'nature'],
  'lake': ['lakes', 'nature'],
  'wildlife': ['wildlife', 'nature'],
  'bird': ['birds', 'nature', 'wildlife'],
  'day trip': ['day-trips', 'excursions'],
  'agra': ['agra', 'day-trips', 'taj-mahal'],
  'taj mahal': ['taj-mahal', 'day-trips'],
  'jaipur': ['jaipur', 'day-trips'],
  'mathura': ['mathura', 'day-trips', 'religious'],
  'vrindavan': ['vrindavan', 'day-trips', 'religious'],
  'spice': ['spices', 'shopping', 'food'],
  'textile': ['textiles', 'shopping', 'handicrafts'],
  'handicraft': ['handicrafts', 'shopping'],
  'souvenir': ['souvenirs', 'shopping'],
  'jewel': ['jewellery', 'shopping'],
  'leather': ['leather', 'shopping'],
};

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const data = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (kvMatch) {
      data[kvMatch[1]] = kvMatch[2];
    }
  }

  return data;
}

function inferTags(title, category) {
  const tags = new Set();
  const titleLower = title.toLowerCase();

  // Add category-based tags
  if (CATEGORY_TAGS[category]) {
    for (const tag of CATEGORY_TAGS[category]) {
      tags.add(tag);
    }
  }

  // Add keyword-based tags
  for (const [keyword, keywordTags] of Object.entries(KEYWORD_TAGS)) {
    if (titleLower.includes(keyword)) {
      for (const tag of keywordTags) {
        tags.add(tag);
      }
    }
  }

  // Ensure at least 2 tags
  if (tags.size < 2) {
    tags.add('travel');
  }

  return Array.from(tags).slice(0, 5); // Max 5 tags
}

function addTagsToFrontmatter(content, tags) {
  const normalized = content.replace(/\r\n/g, '\n');

  // Check if tags already exist
  if (normalized.match(/^tags:/m)) {
    return null; // Skip if tags exist
  }

  const tagsYaml = `tags:\n${tags.map(t => `  - "${t}"`).join('\n')}\n`;

  // Insert tags before the closing ---
  const newContent = normalized.replace(
    /^(---\n[\s\S]*?\n)(---)/,
    `$1${tagsYaml}$2`
  );

  return newContent;
}

async function getAllMarkdownFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const cityFilter = args.includes('--city') ? args[args.indexOf('--city') + 1] : null;
  const dryRun = args.includes('--dry-run');

  const files = await getAllMarkdownFiles(CONTENT_DIR);
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const data = parseFrontmatter(content);

    if (!data || !data.title || !data.category) {
      skipped++;
      continue;
    }

    // Filter by city if specified
    if (cityFilter && data.city !== cityFilter) {
      continue;
    }

    // Check if already has tags
    if (content.match(/^tags:/m)) {
      skipped++;
      continue;
    }

    const tags = inferTags(data.title, data.category);
    const relativePath = file.replace(CONTENT_DIR, '').replace(/\\/g, '/');

    if (dryRun) {
      console.log(`${relativePath}: ${tags.join(', ')}`);
      updated++;
    } else {
      const newContent = addTagsToFrontmatter(content, tags);
      if (newContent) {
        await writeFile(file, newContent, 'utf-8');
        console.log(`Updated: ${relativePath}`);
        updated++;
      }
    }
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated}, Skipped: ${skipped}`);
}

main().catch(console.error);
