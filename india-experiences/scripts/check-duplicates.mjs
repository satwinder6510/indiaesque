#!/usr/bin/env node
/**
 * Duplicate Intent Detection Script
 *
 * Checks for pages with similar intent to prevent content cannibalization.
 * Uses Levenshtein distance on normalized slugs to detect similarity.
 *
 * Usage:
 *   node scripts/check-duplicates.mjs                           # Check all pages
 *   node scripts/check-duplicates.mjs --check "best-restaurants-mumbai"  # Check before creating
 *   node scripts/check-duplicates.mjs --threshold 70            # Custom similarity threshold (default: 60%)
 *   node scripts/check-duplicates.mjs --city delhi              # Check only Delhi pages
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

const args = process.argv.slice(2);
const CHECK_SLUG = args.includes('--check') ? args[args.indexOf('--check') + 1] : null;
const THRESHOLD = args.includes('--threshold')
  ? parseInt(args[args.indexOf('--threshold') + 1], 10)
  : 60;
const CITY_FILTER = args.includes('--city') ? args[args.indexOf('--city') + 1] : null;

/**
 * Common words to remove for normalization
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'of', 'to', 'for', 'and', 'or', 'is', 'are',
  'do', 'does', 'can', 'should', 'how', 'what', 'where', 'when', 'why',
  'best', 'top', 'guide', 'complete', 'ultimate', 'things'
]);

/**
 * City names for normalization
 */
const CITIES = ['delhi', 'mumbai', 'jaipur', 'kolkata', 'india'];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage
 */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshtein(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Normalize slug for comparison
 * Removes stop words, city names, and standardizes format
 */
function normalizeSlug(slug) {
  // Convert to lowercase and split on hyphens
  let words = slug.toLowerCase().split('-');

  // Remove stop words and city names
  words = words.filter(w => !STOP_WORDS.has(w) && !CITIES.includes(w));

  // Sort alphabetically for order-independent comparison
  words.sort();

  return words.join('-');
}

/**
 * Extract key concepts from slug
 */
function extractConcepts(slug) {
  const words = slug.toLowerCase().split('-');
  return words.filter(w => !STOP_WORDS.has(w) && !CITIES.includes(w) && w.length > 2);
}

/**
 * Check for word overlap between two slugs
 */
function wordOverlap(slug1, slug2) {
  const words1 = new Set(extractConcepts(slug1));
  const words2 = new Set(extractConcepts(slug2));

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }

  const total = Math.max(words1.size, words2.size);
  return total > 0 ? Math.round((overlap / total) * 100) : 0;
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

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const data = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      data[key] = value.trim().replace(/^["']|["']$/g, '');
    }
  }

  return data;
}

function getSlug(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1].replace('.md', '');
}

function pathToUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/src\/content\/(.+)$/);
  if (!match) return '/' + normalized + '/';
  return '/' + match[1]
    .replace('.md', '')
    .replace('/_index', '') + '/';
}

async function main() {
  console.log('='.repeat(60));
  console.log('DUPLICATE INTENT DETECTION');
  console.log('='.repeat(60));
  console.log(`\nSimilarity threshold: ${THRESHOLD}%\n`);

  const files = await getAllMarkdownFiles(CONTENT_DIR);
  const pages = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const data = parseFrontmatter(content);
    const slug = getSlug(file);
    const url = pathToUrl(file);

    // Skip _index files
    if (slug === '_index') continue;

    // Apply city filter
    if (CITY_FILTER && !url.includes(`/${CITY_FILTER}/`)) continue;

    pages.push({
      slug,
      url,
      title: data.title || slug,
      city: data.city,
      category: data.category,
      normalized: normalizeSlug(slug),
    });
  }

  console.log(`Scanning ${pages.length} pages...\n`);

  // Check specific slug
  if (CHECK_SLUG) {
    console.log(`--- CHECKING: "${CHECK_SLUG}" ---\n`);

    const normalizedCheck = normalizeSlug(CHECK_SLUG);
    const matches = [];

    for (const page of pages) {
      const simScore = similarity(normalizedCheck, page.normalized);
      const overlapScore = wordOverlap(CHECK_SLUG, page.slug);
      const combinedScore = Math.max(simScore, overlapScore);

      if (combinedScore >= THRESHOLD) {
        matches.push({
          ...page,
          similarity: simScore,
          wordOverlap: overlapScore,
          combined: combinedScore,
        });
      }
    }

    if (matches.length === 0) {
      console.log(`No similar pages found for "${CHECK_SLUG}"`);
      console.log('\nSafe to create this page.');
    } else {
      console.log(`Found ${matches.length} similar page(s):\n`);

      matches
        .sort((a, b) => b.combined - a.combined)
        .forEach(match => {
          console.log(`  ${match.url}`);
          console.log(`    Title: ${match.title}`);
          console.log(`    Similarity: ${match.similarity}% | Word overlap: ${match.wordOverlap}%`);
          console.log();
        });

      console.log('Consider consolidating content or using a different angle.');
    }

    return;
  }

  // Full scan for duplicates
  const duplicates = [];

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const page1 = pages[i];
      const page2 = pages[j];

      // Only compare within same city
      if (page1.city !== page2.city) continue;

      const simScore = similarity(page1.normalized, page2.normalized);
      const overlapScore = wordOverlap(page1.slug, page2.slug);
      const combinedScore = Math.max(simScore, overlapScore);

      if (combinedScore >= THRESHOLD) {
        duplicates.push({
          page1,
          page2,
          similarity: simScore,
          wordOverlap: overlapScore,
          combined: combinedScore,
        });
      }
    }
  }

  if (duplicates.length === 0) {
    console.log('No potential duplicates found.');
  } else {
    console.log(`Found ${duplicates.length} potential duplicate pair(s):\n`);

    duplicates
      .sort((a, b) => b.combined - a.combined)
      .forEach((dup, i) => {
        console.log(`${i + 1}. Similarity: ${dup.similarity}% | Word overlap: ${dup.wordOverlap}%`);
        console.log(`   ${dup.page1.url}`);
        console.log(`     "${dup.page1.title}"`);
        console.log(`   ${dup.page2.url}`);
        console.log(`     "${dup.page2.title}"`);
        console.log();
      });

    console.log('--- RECOMMENDATIONS ---\n');
    console.log('For each pair above, consider:');
    console.log('1. Merging the content into a single, comprehensive page');
    console.log('2. Adding clear differentiation in titles and content');
    console.log('3. Setting up canonical URLs if content overlaps significantly');
    console.log('4. Adding internal links between related pages');
  }

  // Category overlap analysis
  console.log('\n--- CATEGORY ANALYSIS ---\n');

  const byCategory = {};
  for (const page of pages) {
    const cat = page.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(page);
  }

  for (const [category, categoryPages] of Object.entries(byCategory)) {
    if (categoryPages.length > 10) {
      console.log(`${category}: ${categoryPages.length} pages`);

      // Check for clustering
      const concepts = {};
      for (const page of categoryPages) {
        for (const concept of extractConcepts(page.slug)) {
          concepts[concept] = (concepts[concept] || 0) + 1;
        }
      }

      const common = Object.entries(concepts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (common.length > 0) {
        console.log(`  Common concepts: ${common.map(([c, n]) => `${c} (${n})`).join(', ')}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
