#!/usr/bin/env node
/**
 * Add tags to orphan pages to improve internal linking
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

// Tag mappings for orphan pages
const TAG_MAPPINGS = {
  // Delhi - Safety
  'delhi/is-delhi-safe-for-solo-female-travellers': ['safety', 'solo-travel', 'women-travel', 'practical'],
  'delhi/is-delhi-safe-for-tourists': ['safety', 'practical', 'first-time'],
  'delhi/what-should-i-avoid-in-delhi': ['safety', 'scams', 'practical', 'first-time'],

  // Delhi - Health/Food Safety
  'delhi/what-is-delhi-belly-and-how-to-avoid-it': ['health', 'food-safety', 'practical', 'street-food'],

  // Delhi - Money
  'delhi/what-currency-does-delhi-use': ['money', 'practical', 'planning', 'first-time'],

  // Delhi - Transport
  'delhi/is-uber-available-in-delhi': ['transport', 'getting-around', 'practical', 'apps'],

  // Delhi - Weather/Planning
  'delhi/what-is-the-best-time-to-visit-delhi': ['weather', 'planning', 'when-to-visit', 'seasons'],
  'delhi/what-is-the-best-month-to-visit-delhi': ['weather', 'planning', 'when-to-visit', 'seasons'],
  'delhi/what-is-the-weather-like-in-delhi': ['weather', 'planning', 'seasons', 'climate'],

  // Delhi - Heritage
  'delhi/what-are-the-unesco-world-heritage-sites-in-delhi': ['heritage', 'monuments', 'unesco', 'history'],
  'delhi/what-is-agrasen-ki-baoli': ['heritage', 'monuments', 'history', 'stepwell'],
  'delhi/what-is-mehrauli-archaeological-park': ['heritage', 'monuments', 'history', 'archaeology'],
  'delhi/what-are-the-7-cities-of-delhi': ['heritage', 'history', 'overview', 'architecture'],

  // Delhi - Overview/First-timer
  'delhi/is-delhi-worth-visiting': ['overview', 'first-time', 'planning', 'introduction'],
  'delhi/what-is-delhi-best-known-for': ['overview', 'first-time', 'highlights', 'introduction'],
  'delhi/what-is-the-most-visited-place-in-delhi': ['overview', 'monuments', 'highlights', 'first-time'],

  // Delhi - Food
  'delhi/what-is-the-best-street-food-in-delhi': ['food', 'street-food', 'where-to-eat', 'local-food'],
  'delhi/where-to-eat-in-old-delhi': ['food', 'street-food', 'old-delhi', 'chandni-chowk'],
  'delhi/which-area-in-delhi-has-the-best-food': ['food', 'where-to-eat', 'neighbourhoods', 'local-food'],

  // Delhi - Day trips
  'delhi/day-trip-to-mathura-and-vrindavan-from-delhi': ['day-trips', 'excursions', 'religious', 'temples'],

  // Delhi - Practical
  'delhi/what-language-do-they-speak-in-delhi': ['practical', 'language', 'culture', 'first-time'],
  'delhi/what-should-i-pack-for-delhi': ['practical', 'packing', 'planning', 'preparation'],

  // Delhi - Nightlife/Entertainment
  'delhi/where-to-drink-craft-beer-in-delhi': ['nightlife', 'bars', 'craft-beer', 'drinks'],
  'delhi/where-to-hear-live-sufi-music-in-delhi': ['nightlife', 'music', 'sufi', 'entertainment'],

  // Delhi - Activities
  'delhi/where-to-see-street-art-in-delhi': ['art', 'activities', 'street-art', 'culture'],
  'delhi/yoga-classes-in-delhi-for-tourists': ['wellness', 'yoga', 'activities', 'classes'],

  // Jaipur
  'jaipur/what-is-jaipur-famous-for': ['overview', 'first-time', 'highlights', 'introduction'],
  'jaipur/where-to-stay-jaipur': ['accommodation', 'where-to-stay', 'hotels', 'planning'],
};

function addTagsToFrontmatter(content, tags) {
  const normalized = content.replace(/\r\n/g, '\n');

  // Check if tags already exist
  if (normalized.match(/^tags:\s*$/m) || normalized.match(/^tags:\s*\[/m)) {
    console.log('  Tags already exist, skipping');
    return null;
  }

  // Find the end of frontmatter (second ---)
  const match = normalized.match(/^(---\n[\s\S]*?\n)(---)/);
  if (!match) {
    console.log('  No frontmatter found');
    return null;
  }

  const frontmatter = match[1];
  const tagsYaml = `tags:\n${tags.map(t => `  - "${t}"`).join('\n')}\n`;

  // Insert tags before the closing ---
  const newContent = normalized.replace(
    /^(---\n[\s\S]*?\n)(---)/,
    `$1${tagsYaml}$2`
  );

  return newContent;
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [pagePath, tags] of Object.entries(TAG_MAPPINGS)) {
    const filePath = join(CONTENT_DIR, pagePath + '.md');
    console.log(`Processing: ${pagePath}`);

    try {
      const content = await readFile(filePath, 'utf-8');
      const newContent = addTagsToFrontmatter(content, tags);

      if (newContent) {
        await writeFile(filePath, newContent, 'utf-8');
        console.log(`  Added tags: ${tags.join(', ')}`);
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch(console.error);
