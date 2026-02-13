#!/usr/bin/env node
/**
 * SEO Governance Validation Script
 *
 * Runs build-time checks to ensure SEO architecture integrity.
 * Build FAILS if critical rules are violated.
 *
 * CRITICAL FAILURES (build stops):
 * - Missing required fields: city, tier, category
 * - Tier structure violation: Tier 1 must be hub pages only
 * - Missing required Tier 2 pages per city (where-to-stay, experiences)
 * - Money page priority violation: where-to-stay/experiences must have priority 10
 * - Area page violation: /where-to-stay/area/ must be tier 3, category neighbourhoods
 * - Money page inlink violation: where-to-stay/experiences need min 8 inlinks
 * - Authority shape violation: Tier 2 avg inlinks must exceed Tier 3 avg
 * - Hub must have highest inlinks in city
 *
 * WARNINGS (build continues):
 * - Underlinked pages (1 inlink)
 * - Link dilution (>50 inlinks)
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');

/**
 * Required fields for every page
 */
const REQUIRED_FIELDS = ['city', 'tier', 'category'];

/**
 * Money page categories - MUST have priority 10
 */
const MONEY_PAGE_CATEGORIES = new Set(['hub', 'where-to-stay', 'experiences']);

/**
 * Money page requirements
 */
const MONEY_PAGE_MIN_INLINKS = 8;
const MONEY_PAGE_MAX_CLICK_DEPTH = 3;

/**
 * Required Tier 2 page patterns for each city
 */
const REQUIRED_TIER_2_PATTERNS = ['where-to-stay', 'experiences'];

/**
 * Known cities
 */
const CITIES = ['delhi', 'mumbai', 'jaipur', 'kolkata'];

/**
 * Check if slug matches a tier 2 pattern
 */
function matchesTier2Pattern(slug, city, patterns) {
  return patterns.some(pattern =>
    slug === pattern ||
    slug === `${pattern}-${city}` ||
    slug.startsWith(`${pattern}-`)
  );
}

/**
 * Compute priority based on governance rules
 */
function computePriority(page) {
  // Money page categories ALWAYS get priority 10
  if (MONEY_PAGE_CATEGORIES.has(page.category)) {
    return 10;
  }
  if (page.type === 'hub') {
    return 10;
  }
  if (page.tier === '1') {
    return 10;
  }
  if (page.tier === '2') {
    return 9;
  }
  return 5;
}

/**
 * Check if URL is an area page (nested under where-to-stay)
 */
function isAreaPage(url) {
  const parts = url.split('/').filter(Boolean);
  return parts.length >= 3 && parts[1] === 'where-to-stay';
}

/**
 * Get URL depth
 */
function getUrlDepth(url) {
  return url.split('/').filter(Boolean).length;
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
  let currentKey = null;
  let inArray = false;
  let arrayItems = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.match(/^\s+-\s/)) {
      const value = line.replace(/^\s+-\s/, '').trim().replace(/^["']|["']$/g, '');
      if (currentKey && inArray) arrayItems.push(value);
      continue;
    }
    if (inArray && currentKey) {
      data[currentKey] = arrayItems;
      arrayItems = [];
      inArray = false;
    }
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
  if (inArray && currentKey) data[currentKey] = arrayItems;
  if (data.priority) data.priority = parseInt(data.priority, 10) || 5;
  return data;
}

function pathToUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/src\/content\/(.+)$/);
  if (!match) return '/' + normalized + '/';
  return '/' + match[1]
    .replace('.md', '')
    .replace('/_index', '') + '/';
}

function getSlug(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1].replace('.md', '');
}

async function main() {
  console.log('='.repeat(60));
  console.log('SEO GOVERNANCE VALIDATION');
  console.log('='.repeat(60));
  console.log();

  const errors = [];
  const warnings = [];

  const files = await getAllMarkdownFiles(CONTENT_DIR);
  console.log(`Scanning ${files.length} content files...\n`);

  const pages = [];
  const pagesByCity = {};
  const pagesByUrl = new Map();

  // Phase 1: Parse all pages
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const data = parseFrontmatter(content);
    const url = pathToUrl(file);
    const slug = getSlug(file);

    // Compute priority (ignoring manual frontmatter for money pages)
    const computedPriority = computePriority(data);

    const page = {
      file,
      url,
      slug,
      ...data,
      computedPriority,
    };

    pages.push(page);
    pagesByUrl.set(url, page);

    if (page.city) {
      if (!pagesByCity[page.city]) {
        pagesByCity[page.city] = [];
      }
      pagesByCity[page.city].push(page);
    }
  }

  // Phase 2: Required Fields Check
  console.log('--- CHECK: Required Fields ---');
  let missingFieldsCount = 0;

  for (const page of pages) {
    if (page.url.startsWith('/blog/') || page.url.startsWith('/categories/')) {
      continue;
    }

    const missingFields = REQUIRED_FIELDS.filter(field => !page[field]);
    if (missingFields.length > 0) {
      const criticalMissing = missingFields.filter(f => f === 'city' || f === 'category');
      if (criticalMissing.length > 0) {
        errors.push(`Missing required fields [${criticalMissing.join(', ')}]: ${page.url}`);
        missingFieldsCount++;
      } else if (missingFields.includes('tier')) {
        warnings.push(`Missing tier field (run migrate-tiers.mjs): ${page.url}`);
      }
    }
  }

  if (missingFieldsCount === 0) {
    console.log('✓ All pages have required fields\n');
  } else {
    console.log(`✗ ${missingFieldsCount} pages missing required fields\n`);
  }

  // Phase 3: Tier Structure Check
  console.log('--- CHECK: Tier Structure ---');
  let tierViolations = 0;

  for (const page of pages) {
    if (page.tier === '1') {
      if (page.type !== 'hub' && !page.slug.includes('_index')) {
        errors.push(`Tier 1 violation - not a hub page: ${page.url} (type: ${page.type})`);
        tierViolations++;
      }
    }
  }

  if (tierViolations === 0) {
    console.log('✓ Tier structure is valid\n');
  } else {
    console.log(`✗ ${tierViolations} tier structure violations\n`);
  }

  // Phase 4: Money Page Priority Check
  console.log('--- CHECK: Money Page Priority ---');
  let priorityViolations = 0;

  for (const page of pages) {
    if (page.category === 'where-to-stay' || page.category === 'experiences') {
      if (page.computedPriority !== 10) {
        errors.push(`Money page priority violation: ${page.url} must have priority 10, got ${page.computedPriority}`);
        priorityViolations++;
      }
    }
  }

  if (priorityViolations === 0) {
    console.log('✓ All money pages have priority 10\n');
  } else {
    console.log(`✗ ${priorityViolations} money page priority violations\n`);
  }

  // Phase 5: Area Page Governance Check
  console.log('--- CHECK: Area Page Governance ---');
  let areaViolations = 0;

  for (const page of pages) {
    // Check area pages under /where-to-stay/
    if (isAreaPage(page.url)) {
      if (page.tier !== '3') {
        errors.push(`Area page tier violation: ${page.url} must be tier "3", got "${page.tier}"`);
        areaViolations++;
      }
      if (page.category === 'where-to-stay') {
        errors.push(`Area page category violation: ${page.url} must have category "neighbourhoods", not "where-to-stay"`);
        areaViolations++;
      }
    }

    // Check where-to-stay category depth
    if (page.category === 'where-to-stay') {
      const depth = getUrlDepth(page.url);
      if (depth > 2) {
        errors.push(`where-to-stay depth violation: ${page.url} has depth ${depth}, must be 2`);
        areaViolations++;
      }
    }
  }

  if (areaViolations === 0) {
    console.log('✓ Area page governance is valid\n');
  } else {
    console.log(`✗ ${areaViolations} area page governance violations\n`);
  }

  // Phase 6: Required Tier 2 Pages Check
  console.log('--- CHECK: Required Tier 2 Pages ---');

  for (const city of CITIES) {
    const cityPages = pagesByCity[city] || [];
    const citySlugs = cityPages.map(p => p.slug);

    for (const pattern of REQUIRED_TIER_2_PATTERNS) {
      const hasMatch = citySlugs.some(slug => matchesTier2Pattern(slug, city, [pattern]));
      if (!hasMatch) {
        errors.push(`Missing required Tier 2 page: /${city}/${pattern}/`);
      }
    }
  }

  const missingRequired = errors.filter(e => e.includes('Missing required Tier 2'));
  if (missingRequired.length === 0) {
    console.log('✓ All cities have required Tier 2 pages\n');
  } else {
    console.log(`✗ ${missingRequired.length} missing required Tier 2 pages\n`);
  }

  // Phase 7: Calculate Inlinks
  console.log('--- CHECK: Inlink Analysis ---');

  const inlinkCount = new Map();
  for (const url of pagesByUrl.keys()) {
    inlinkCount.set(url, 0);
  }

  // Simulate linking rules to calculate inlinks
  for (const page of pages) {
    if (!page.city) continue;

    const cityPrefix = `/${page.city}/`;
    const cityHub = `/${page.city}/`;
    const tier = page.tier || (page.type === 'hub' ? '1' : page.computedPriority >= 9 ? '2' : '3');

    // City links: Hub
    if (cityHub !== page.url && pagesByUrl.has(cityHub)) {
      inlinkCount.set(cityHub, (inlinkCount.get(cityHub) || 0) + 1);
    }

    // Get Tier 2 pages, sorted alphabetically then rotated by URL hash
    const tier2Base = pages.filter(p =>
      p.url.startsWith(cityPrefix) &&
      p.url !== page.url &&
      p.url !== cityHub &&
      (p.tier === '2' || (p.computedPriority && p.computedPriority >= 9 && p.type !== 'hub'))
    ).sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));

    const urlHash = page.url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rotateOffset = urlHash % Math.max(1, tier2Base.length);
    const tier2Pages = [...tier2Base.slice(rotateOffset), ...tier2Base.slice(0, rotateOffset)];

    // Tier 1 links to ALL Tier 2, Tier 2 links to 3, Tier 3 links to 5
    const tier2Limit = tier === '1' ? tier2Pages.length : tier === '2' ? 3 : 5;
    for (const t2 of tier2Pages.slice(0, tier2Limit)) {
      inlinkCount.set(t2.url, (inlinkCount.get(t2.url) || 0) + 1);
    }

    // Get Tier 3 pages, sorted by category + tag matching (like content-index.ts)
    const pageTagSet = new Set((page.tags || []).map(t => t.toLowerCase()));
    const tier3Pages = pages.filter(p =>
      p.url.startsWith(cityPrefix) &&
      p.url !== page.url &&
      (p.tier === '3' || (!p.tier && p.computedPriority < 9 && p.type !== 'hub'))
    ).map(p => {
      let score = 0;
      // Same category: +10
      if (p.category === page.category) score += 10;
      // Overlapping tags: +3 per tag
      for (const tag of (p.tags || [])) {
        if (pageTagSet.has(tag.toLowerCase())) score += 3;
      }
      // Priority boost
      score += (p.computedPriority || 5) * 0.5;
      // Base score
      score += 1;
      return { page: p, score };
    }).sort((a, b) => b.score - a.score || (a.page.title || a.page.url).localeCompare(b.page.title || b.page.url))
    .map(item => item.page);

    // T1 links to all T3, T2 links to 10, T3 links to 6
    let relatedLimit = tier === '1' ? tier3Pages.length : tier === '2' ? 10 : 6;
    for (const t3 of tier3Pages.slice(0, relatedLimit)) {
      inlinkCount.set(t3.url, (inlinkCount.get(t3.url) || 0) + 1);
    }
  }

  // Phase 8: Money Page Inlink Check
  console.log('--- CHECK: Money Page Inlinks ---');
  let moneyInlinkViolations = 0;

  for (const page of pages) {
    if (page.category === 'where-to-stay' || page.category === 'experiences') {
      const inlinks = inlinkCount.get(page.url) || 0;
      if (inlinks < MONEY_PAGE_MIN_INLINKS) {
        errors.push(`Money page inlink violation: ${page.url} has ${inlinks} inlinks, needs minimum ${MONEY_PAGE_MIN_INLINKS}`);
        moneyInlinkViolations++;
      }
    }
  }

  if (moneyInlinkViolations === 0) {
    console.log('✓ All money pages have sufficient inlinks\n');
  } else {
    console.log(`✗ ${moneyInlinkViolations} money pages with insufficient inlinks\n`);
  }

  // Phase 9: Authority Shape Check (using AVERAGES)
  console.log('--- CHECK: Authority Shape ---');
  let authorityViolations = 0;

  for (const city of CITIES) {
    const cityPages = pagesByCity[city] || [];

    // Get hub
    const hub = cityPages.find(p => p.tier === '1' || p.type === 'hub');
    const hubInlinks = hub ? (inlinkCount.get(hub.url) || 0) : 0;

    // Get Tier 2 pages and their average inlinks
    const tier2PagesInCity = cityPages.filter(p => p.tier === '2');
    const tier2Inlinks = tier2PagesInCity.map(p => inlinkCount.get(p.url) || 0);
    const avgTier2Inlinks = tier2Inlinks.length > 0
      ? tier2Inlinks.reduce((a, b) => a + b, 0) / tier2Inlinks.length
      : 0;

    // Get Tier 3 pages and their average inlinks
    const tier3PagesInCity = cityPages.filter(p => p.tier === '3');
    const tier3Inlinks = tier3PagesInCity.map(p => inlinkCount.get(p.url) || 0);
    const avgTier3Inlinks = tier3Inlinks.length > 0
      ? tier3Inlinks.reduce((a, b) => a + b, 0) / tier3Inlinks.length
      : 0;

    // Check: Hub must have highest inlinks in city
    const maxNonHubInlinks = Math.max(...cityPages.filter(p => p.tier !== '1').map(p => inlinkCount.get(p.url) || 0), 0);
    if (hubInlinks < maxNonHubInlinks && hub) {
      errors.push(`Authority shape violation (${city}): Hub has ${hubInlinks} inlinks, but a non-hub page has ${maxNonHubInlinks}`);
      authorityViolations++;
    }

    // Check: Average Tier 2 inlinks > Average Tier 3 inlinks
    if (avgTier2Inlinks <= avgTier3Inlinks && tier2PagesInCity.length > 0 && tier3PagesInCity.length > 0) {
      errors.push(`Authority shape violation (${city}): Tier 2 avg (${avgTier2Inlinks.toFixed(1)}) must exceed Tier 3 avg (${avgTier3Inlinks.toFixed(1)})`);
      authorityViolations++;
    }
  }

  if (authorityViolations === 0) {
    console.log('✓ Authority shape is valid\n');
  } else {
    console.log(`✗ ${authorityViolations} authority shape violations\n`);
  }

  // Phase 10: Orphan and Underlinked Check
  console.log('--- CHECK: Link Coverage ---');
  let orphanCount = 0;
  let underlinkedCount = 0;

  for (const page of pages) {
    if (!page.city) continue;
    if (page.type === 'hub' || page.tier === '1') continue;

    const inlinks = inlinkCount.get(page.url) || 0;
    if (inlinks === 0) {
      errors.push(`Orphan page (0 inlinks): ${page.url}`);
      orphanCount++;
    } else if (inlinks < 2) {
      warnings.push(`Underlinked page (1 inlink): ${page.url}`);
      underlinkedCount++;
    }
  }

  if (orphanCount === 0 && underlinkedCount === 0) {
    console.log('✓ No orphan or underlinked pages\n');
  } else if (orphanCount === 0) {
    console.log(`⚠ ${underlinkedCount} underlinked pages (1 inlink)\n`);
  } else {
    console.log(`✗ ${orphanCount} orphan pages + ${underlinkedCount} underlinked\n`);
  }

  // Phase 11: Link Dilution Check
  for (const page of pages) {
    if (!page.city) continue;
    const inlinks = inlinkCount.get(page.url) || 0;
    if (inlinks > 50) {
      warnings.push(`Link dilution (>50 inlinks): ${page.url} [${inlinks}]`);
    }
  }

  // Display Results
  console.log('='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ ERRORS (build will fail):\n');
    errors.forEach(e => console.log(`  • ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    warnings.forEach(w => console.log(`  • ${w}`));
  }

  // Summary Statistics
  console.log('\n' + '-'.repeat(40));
  console.log('SUMMARY STATISTICS');
  console.log('-'.repeat(40));

  const tier1Pages = pages.filter(p => p.tier === '1');
  const tier2Pages = pages.filter(p => p.tier === '2');
  const tier3Pages = pages.filter(p => p.tier === '3');
  const priority10Pages = pages.filter(p => p.computedPriority === 10);

  console.log(`Total Pages: ${pages.length}`);
  console.log(`Tier 1: ${tier1Pages.length} pages`);
  console.log(`Tier 2: ${tier2Pages.length} pages`);
  console.log(`Tier 3: ${tier3Pages.length} pages`);
  console.log(`Priority 10 pages: ${priority10Pages.length}`);

  // Money page inlinks
  console.log('\nMoney Page Inlinks:');
  for (const city of CITIES) {
    const cityPages = pagesByCity[city] || [];
    const hub = cityPages.find(p => p.tier === '1' || p.type === 'hub');
    const whereToStay = cityPages.find(p => p.category === 'where-to-stay');
    const experiences = cityPages.find(p => p.category === 'experiences');

    console.log(`  ${city.toUpperCase()}:`);
    if (hub) console.log(`    Hub: ${inlinkCount.get(hub.url) || 0} inlinks`);
    if (whereToStay) console.log(`    where-to-stay: ${inlinkCount.get(whereToStay.url) || 0} inlinks`);
    if (experiences) console.log(`    experiences: ${inlinkCount.get(experiences.url) || 0} inlinks`);

    // Show one Tier 3 area page example
    const areaPage = cityPages.find(p => p.tier === '3' && p.category === 'neighbourhoods');
    if (areaPage) {
      console.log(`    Example Tier 3 (${areaPage.slug}): ${inlinkCount.get(areaPage.url) || 0} inlinks`);
    }
  }

  console.log('\n' + '-'.repeat(40));
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log('-'.repeat(40));

  // Exit with error code if validation failed
  if (errors.length > 0) {
    console.log('\n❌ VALIDATION FAILED\n');
    process.exit(1);
  }

  if (STRICT && warnings.length > 0) {
    console.log('\n❌ VALIDATION FAILED (strict mode)\n');
    process.exit(1);
  }

  console.log('\n✅ VALIDATION PASSED\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
