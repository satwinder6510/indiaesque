#!/usr/bin/env node
/**
 * Tier Migration Script
 *
 * Adds the `tier` field to all content pages based on their structure:
 * - Hub pages (_index.md) → tier: "1"
 * - Authority pages (guides, consolidated content) → tier: "2"
 * - Micro pages (PAA content, specific topics) → tier: "3"
 *
 * Usage:
 *   node scripts/migrate-tiers.mjs --dry-run    # Preview changes
 *   node scripts/migrate-tiers.mjs              # Apply changes
 *   node scripts/migrate-tiers.mjs --verbose    # Show details
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

/**
 * Tier 2 page patterns - these are authority pages
 */
const TIER_2_SLUGS = new Set([
  'food-guide',
  'things-to-do',
  'neighbourhoods',
  'nightlife-guide',
  'day-trips',
  'heritage-guide',
  'safety-guide',
  'experiences',
  'where-to-stay',
  'food-tours',
  'heritage-walks',
  'markets-shopping',
  'activities',
]);

/**
 * Additional patterns that indicate Tier 2
 */
const TIER_2_CATEGORIES = new Set([
  'food',
  'heritage',
  'activities',
]);

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

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { data: {}, body: content, raw: '' };

  const yaml = match[1];
  const body = normalized.slice(match[0].length);
  const data = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let inArray = false;
  let arrayItems = [];
  let inFaq = false;
  let faqItems = [];
  let currentFaqItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle FAQ specially
    if (line.match(/^faq:\s*$/)) {
      inFaq = true;
      currentKey = 'faq';
      continue;
    }

    if (inFaq) {
      if (line.match(/^\s+-\s+question:/)) {
        if (currentFaqItem) faqItems.push(currentFaqItem);
        currentFaqItem = { question: line.replace(/^\s+-\s+question:\s*["']?/, '').replace(/["']$/, '') };
        continue;
      }
      if (line.match(/^\s+answer:/)) {
        if (currentFaqItem) {
          currentFaqItem.answer = line.replace(/^\s+answer:\s*["']?/, '').replace(/["']$/, '');
        }
        continue;
      }
      // End of faq if we hit a non-indented line
      if (!line.match(/^\s/) && line.trim()) {
        if (currentFaqItem) faqItems.push(currentFaqItem);
        data.faq = faqItems;
        inFaq = false;
        faqItems = [];
        currentFaqItem = null;
        // Fall through to process this line
      } else {
        continue;
      }
    }

    if (!line.trim()) continue;

    // Array item
    if (line.match(/^\s+-\s/)) {
      const value = line.replace(/^\s+-\s/, '').trim().replace(/^["']|["']$/g, '');
      if (currentKey && inArray) arrayItems.push(value);
      continue;
    }

    // End array if we're starting a new key
    if (inArray && currentKey) {
      data[currentKey] = arrayItems;
      arrayItems = [];
      inArray = false;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;
      if (value.trim() === '') {
        inArray = true;
        arrayItems = [];
      } else {
        data[key] = value.trim().replace(/^["']|["']$/g, '');
        inArray = false;
      }
    }
  }

  // Finalize
  if (inFaq && currentFaqItem) {
    faqItems.push(currentFaqItem);
    data.faq = faqItems;
  }
  if (inArray && currentKey) {
    data[currentKey] = arrayItems;
  }
  if (data.priority) data.priority = parseInt(data.priority, 10) || 5;

  return { data, body, raw: yaml };
}

function inferTier(filePath, data) {
  const fileName = basename(filePath);
  const slug = fileName.replace('.md', '');

  // Hub pages (_index.md) are Tier 1
  if (fileName === '_index.md') {
    return '1';
  }

  // Check page type
  if (data.type === 'hub') {
    return '1';
  }

  // Check if it's a known Tier 2 slug
  if (TIER_2_SLUGS.has(slug)) {
    return '2';
  }

  // Check priority - existing priority 9+ suggests Tier 2
  if (data.priority && data.priority >= 9) {
    return '2';
  }

  // Check category for Tier 2 patterns
  if (data.category && TIER_2_CATEGORIES.has(data.category.toLowerCase())) {
    // Only if it's a consolidated guide (priority 9)
    if (data.priority === 9) {
      return '2';
    }
  }

  // Check type - category pages are often Tier 2
  if (data.type === 'category') {
    return '2';
  }

  // Default: Tier 3 micro pages
  return '3';
}

function addTierToFrontmatter(content, tier) {
  // Normalize line endings to LF and work with normalized content throughout
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^(---\n)([\s\S]*?)(\n---)/);

  if (!match) {
    return content;
  }

  const [fullMatch, start, yaml, end] = match;

  // Check if tier already exists
  if (yaml.includes('\ntier:') || yaml.startsWith('tier:')) {
    // Update existing tier
    const updatedYaml = yaml.replace(/^tier:.*$/m, `tier: "${tier}"`);
    return normalized.replace(fullMatch, `${start}${updatedYaml}${end}`);
  }

  // Add tier after city field (or after description if no city)
  let updatedYaml;
  if (yaml.includes('\ncity:')) {
    // Match city line with any value (quoted or unquoted)
    updatedYaml = yaml.replace(/(\ncity:\s*[^\n]+)/, `$1\ntier: "${tier}"`);
  } else if (yaml.includes('\ndescription:')) {
    updatedYaml = yaml.replace(/(\ndescription:\s*[^\n]+)/, `$1\ntier: "${tier}"`);
  } else {
    // Add at the beginning
    updatedYaml = `tier: "${tier}"\n${yaml}`;
  }

  // Replace in normalized content (not original) to ensure match works
  return normalized.replace(fullMatch, `${start}${updatedYaml}${end}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('TIER MIGRATION SCRIPT');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  } else {
    console.log('\n⚠️  APPLYING CHANGES - Files will be modified\n');
  }

  const files = await getAllMarkdownFiles(CONTENT_DIR);
  console.log(`Found ${files.length} markdown files\n`);

  const stats = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
    alreadyHasTier: 0,
    updated: 0,
    errors: 0,
  };

  const tierBreakdown = {
    '1': [],
    '2': [],
    '3': [],
  };

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const { data } = parseFrontmatter(content);
      const relativePath = file.replace(CONTENT_DIR, '').replace(/\\/g, '/');

      // Check if tier already exists
      if (data.tier) {
        stats.alreadyHasTier++;
        tierBreakdown[data.tier].push(relativePath);
        if (VERBOSE) {
          console.log(`✓ Already has tier ${data.tier}: ${relativePath}`);
        }
        continue;
      }

      // Infer tier
      const tier = inferTier(file, data);
      tierBreakdown[tier].push(relativePath);

      if (tier === '1') stats.tier1++;
      else if (tier === '2') stats.tier2++;
      else stats.tier3++;

      if (VERBOSE) {
        console.log(`→ Tier ${tier}: ${relativePath}`);
      }

      // Update file
      if (!DRY_RUN) {
        const updatedContent = addTierToFrontmatter(content, tier);
        await writeFile(file, updatedContent, 'utf-8');
        stats.updated++;
      }
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
      stats.errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nTotal files: ${files.length}`);
  console.log(`Already had tier: ${stats.alreadyHasTier}`);
  console.log(`\nTier distribution:`);
  console.log(`  Tier 1 (Hub):   ${stats.tier1} pages`);
  console.log(`  Tier 2 (Guide): ${stats.tier2} pages`);
  console.log(`  Tier 3 (Micro): ${stats.tier3} pages`);

  if (!DRY_RUN) {
    console.log(`\n✅ Updated ${stats.updated} files`);
  } else {
    console.log(`\n📋 Would update ${stats.tier1 + stats.tier2 + stats.tier3} files`);
    console.log('\nRun without --dry-run to apply changes.');
  }

  if (stats.errors > 0) {
    console.log(`\n❌ Errors: ${stats.errors}`);
  }

  // Show Tier 2 pages for verification
  if (VERBOSE || DRY_RUN) {
    console.log('\n' + '-'.repeat(40));
    console.log('TIER 2 PAGES (Authority Pages):');
    console.log('-'.repeat(40));
    tierBreakdown['2'].forEach(p => console.log(`  ${p}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
