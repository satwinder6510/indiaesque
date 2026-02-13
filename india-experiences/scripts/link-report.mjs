#!/usr/bin/env node
/**
 * Link Analysis Report with SEO Governance Metrics
 *
 * Generates a comprehensive report of internal linking structure,
 * tier distribution, and SEO governance health.
 *
 * Usage:
 *   node scripts/link-report.mjs              # Full report
 *   node scripts/link-report.mjs --city delhi # City-specific report
 *   node scripts/link-report.mjs --json       # JSON output
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

const args = process.argv.slice(2);
const CITY_FILTER = args.includes('--city') ? args[args.indexOf('--city') + 1] : null;
const JSON_OUTPUT = args.includes('--json');

const CITIES = ['delhi', 'mumbai', 'jaipur', 'kolkata'];

/**
 * Required Tier 2 pages for city expansion readiness
 */
// Required Tier 2 slugs - also match city-suffixed versions (where-to-stay-mumbai)
const REQUIRED_TIER_2_PATTERNS = ['where-to-stay', 'experiences'];
const RECOMMENDED_TIER_2 = ['neighbourhoods', 'food-guide', 'things-to-do', 'day-trips', 'nightlife-guide'];

// Check if slug matches a required pattern
function matchesTier2Pattern(slug, city, patterns) {
  return patterns.some(pattern =>
    slug === pattern ||
    slug === `${pattern}-${city}` ||
    slug.startsWith(`${pattern}-`)
  );
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

  const yaml = match[1].replace(/\r/g, '');
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
  const files = await getAllMarkdownFiles(CONTENT_DIR);
  const pages = [];
  const pagesByCity = {};

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const data = parseFrontmatter(content);
    const url = pathToUrl(file);
    const slug = getSlug(file);

    // Infer tier if not present
    const tier = data.tier || (data.type === 'hub' ? '1' : data.priority >= 9 ? '2' : '3');

    const page = {
      url,
      slug,
      title: data.title || url,
      city: data.city,
      category: data.category,
      priority: data.priority || 5,
      tier,
      type: data.type,
      tags: data.tags || [],
    };

    pages.push(page);

    if (page.city) {
      if (!pagesByCity[page.city]) {
        pagesByCity[page.city] = [];
      }
      pagesByCity[page.city].push(page);
    }
  }

  const index = new Map();
  for (const page of pages) index.set(page.url, page);

  // Calculate inlinks with tier-based rules
  const inlinkCount = new Map();
  for (const url of index.keys()) inlinkCount.set(url, 0);

  for (const page of pages) {
    if (!page.city) continue;
    const cityPrefix = `/${page.city}/`;
    const cityHub = `/${page.city}/`;
    const tier = page.tier;

    // City links
    if (cityHub !== page.url && index.has(cityHub)) {
      inlinkCount.set(cityHub, (inlinkCount.get(cityHub) || 0) + 1);
    }

    // Tier 2 links - sorted alphabetically then rotated by URL hash for even distribution
    const tier2Base = pages
      .filter(p =>
        p.url.startsWith(cityPrefix) &&
        p.url !== page.url &&
        p.url !== cityHub &&
        p.tier === '2'
      )
      .sort((a, b) => a.title.localeCompare(b.title));

    // Rotate based on URL hash for even distribution
    const urlHash = page.url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rotateOffset = urlHash % Math.max(1, tier2Base.length);
    const tier2Pages = [...tier2Base.slice(rotateOffset), ...tier2Base.slice(0, rotateOffset)];

    const tier2Limit = tier === '1' ? tier2Pages.length : tier === '2' ? 3 : 5;
    for (const t2 of tier2Pages.slice(0, tier2Limit)) {
      inlinkCount.set(t2.url, (inlinkCount.get(t2.url) || 0) + 1);
    }

    // Tier 3 links (related) - use tag-based scoring like content-index.ts
    const pageTagSet = new Set((page.tags || []).map(t => t.toLowerCase()));
    const tier3Pages = pages
      .filter(p =>
        p.url.startsWith(cityPrefix) &&
        p.url !== page.url &&
        p.tier === '3'
      )
      .map(p => {
        let score = 0;
        // Same category: +10
        if (p.category === page.category) score += 10;
        // Overlapping tags: +3 per tag
        for (const tag of (p.tags || [])) {
          if (pageTagSet.has(tag.toLowerCase())) score += 3;
        }
        // Priority boost
        score += (p.priority || 5) * 0.5;
        // Base score
        score += 1;
        return { page: p, score };
      })
      .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
      .map(item => item.page);

    const tier3Limit = tier === '1' ? tier3Pages.length : tier === '2' ? 10 : 6;
    for (const t3 of tier3Pages.slice(0, tier3Limit)) {
      inlinkCount.set(t3.url, (inlinkCount.get(t3.url) || 0) + 1);
    }
  }

  // Generate report data
  const reportData = {
    summary: {
      totalPages: pages.length,
      totalLinks: Array.from(inlinkCount.values()).reduce((a, b) => a + b, 0),
      avgLinksPerPage: 0,
    },
    tierDistribution: { '1': 0, '2': 0, '3': 0 },
    byCity: {},
    topInlinked: [],
    orphans: [],
    underlinked: [],
    overlinked: [],
    expansionReadiness: {},
  };

  // Calculate summary
  reportData.summary.avgLinksPerPage = (reportData.summary.totalLinks / pages.length).toFixed(1);

  // Tier distribution
  for (const page of pages) {
    reportData.tierDistribution[page.tier]++;
  }

  // Per-city metrics
  for (const city of CITIES) {
    if (CITY_FILTER && city !== CITY_FILTER) continue;

    const cityPages = pagesByCity[city] || [];
    const citySlugs = cityPages.map(p => p.slug);

    const cityData = {
      totalPages: cityPages.length,
      tierDistribution: { '1': 0, '2': 0, '3': 0 },
      topInlinked: [],
      orphans: [],
      missingTier2: [],
    };

    for (const page of cityPages) {
      cityData.tierDistribution[page.tier]++;
    }

    // Top inlinked in city
    cityData.topInlinked = cityPages
      .map(p => ({ url: p.url, title: p.title, tier: p.tier, inlinks: inlinkCount.get(p.url) || 0 }))
      .sort((a, b) => b.inlinks - a.inlinks)
      .slice(0, 10);

    // Orphans in city
    cityData.orphans = cityPages
      .filter(p => {
        if (p.tier === '1') return false;
        return (inlinkCount.get(p.url) || 0) < 2;
      })
      .map(p => p.url);

    // Missing Tier 2 pages
    for (const required of [...REQUIRED_TIER_2_PATTERNS, ...RECOMMENDED_TIER_2]) {
      if (!citySlugs.includes(required)) {
        cityData.missingTier2.push(required);
      }
    }

    reportData.byCity[city] = cityData;
  }

  // Top inlinked overall
  reportData.topInlinked = Array.from(inlinkCount.entries())
    .map(([url, count]) => {
      const page = index.get(url);
      return {
        url,
        title: page?.title || url,
        tier: page?.tier || '?',
        priority: page?.priority || 5,
        inlinks: count
      };
    })
    .sort((a, b) => b.inlinks - a.inlinks)
    .slice(0, 20);

  // Orphans (overall)
  reportData.orphans = Array.from(inlinkCount.entries())
    .filter(([url, count]) => {
      const page = index.get(url);
      if (!page || page.tier === '1') return false;
      const parts = url.split('/').filter(Boolean);
      return count < 2 && parts.length > 1;
    })
    .map(([url]) => url);

  // Underlinked priority pages
  reportData.underlinked = pages
    .filter(p => {
      const inlinks = inlinkCount.get(p.url) || 0;
      return (p.tier === '1' || p.priority === 10) && inlinks < 8;
    })
    .map(p => ({ url: p.url, inlinks: inlinkCount.get(p.url) || 0 }));

  // Overlinked pages (>50)
  reportData.overlinked = Array.from(inlinkCount.entries())
    .filter(([, count]) => count > 50)
    .map(([url, count]) => ({ url, inlinks: count }));

  // Expansion readiness
  for (const city of CITIES) {
    const cityPages = pagesByCity[city] || [];
    const citySlugs = cityPages.map(p => p.slug);

    const hasRequired = REQUIRED_TIER_2_PATTERNS.every(pattern =>
      citySlugs.some(slug => matchesTier2Pattern(slug, city, [pattern]))
    );
    const hasRecommended = RECOMMENDED_TIER_2.filter(pattern =>
      citySlugs.some(slug => matchesTier2Pattern(slug, city, [pattern]))
    ).length;
    const tier2Count = cityPages.filter(p => p.tier === '2').length;
    const tier3Count = cityPages.filter(p => p.tier === '3').length;

    reportData.expansionReadiness[city] = {
      ready: hasRequired,
      tier2Pages: tier2Count,
      tier3Pages: tier3Count,
      missingRequired: REQUIRED_TIER_2_PATTERNS.filter(pattern =>
        !citySlugs.some(slug => matchesTier2Pattern(slug, city, [pattern]))
      ),
      missingRecommended: RECOMMENDED_TIER_2.filter(pattern =>
        !citySlugs.some(slug => matchesTier2Pattern(slug, city, [pattern]))
      ),
      score: hasRequired ? (hasRecommended / RECOMMENDED_TIER_2.length * 100).toFixed(0) + '%' : 'Not Ready',
    };
  }

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(reportData, null, 2));
    return;
  }

  // Text output
  console.log('='.repeat(60));
  console.log('INTERNAL LINK ANALYSIS REPORT');
  console.log('SEO Governance Metrics');
  console.log('='.repeat(60));

  console.log(`\nTotal Pages: ${reportData.summary.totalPages}`);
  console.log(`Total Internal Links: ${reportData.summary.totalLinks}`);
  console.log(`Avg Links per Page: ${reportData.summary.avgLinksPerPage}`);

  console.log('\n--- TIER DISTRIBUTION (Overall) ---');
  console.log(`Tier 1 (Hub):   ${reportData.tierDistribution['1']} pages`);
  console.log(`Tier 2 (Guide): ${reportData.tierDistribution['2']} pages`);
  console.log(`Tier 3 (Micro): ${reportData.tierDistribution['3']} pages`);

  console.log('\n--- TOP 20 PAGES BY INLINKS ---');
  console.log('(Authority pages should be at top)\n');

  reportData.topInlinked.forEach((page, i) => {
    const tierLabel = page.tier === '1' ? 'HUB' : page.tier === '2' ? 'GUIDE' : '';
    console.log(`${(i + 1).toString().padStart(2)}. [${page.inlinks.toString().padStart(3)} links] ${tierLabel.padEnd(5)} ${page.url}`);
  });

  console.log('\n--- CITY EXPANSION READINESS ---\n');

  for (const city of CITIES) {
    const data = reportData.expansionReadiness[city];
    const status = data.ready ? '✓' : '✗';
    console.log(`${status} ${city.toUpperCase()}: ${data.score}`);
    console.log(`  Tier 2: ${data.tier2Pages} | Tier 3: ${data.tier3Pages}`);
    if (data.missingRequired.length > 0) {
      console.log(`  Missing required: ${data.missingRequired.join(', ')}`);
    }
    if (data.missingRecommended.length > 0) {
      console.log(`  Missing recommended: ${data.missingRecommended.join(', ')}`);
    }
    console.log();
  }

  console.log('--- TIER DISTRIBUTION BY CITY ---\n');

  for (const city of CITIES) {
    if (CITY_FILTER && city !== CITY_FILTER) continue;
    const data = reportData.byCity[city];
    if (!data) continue;

    console.log(`${city.toUpperCase()}:`);
    console.log(`  Total: ${data.totalPages} | T1: ${data.tierDistribution['1']} | T2: ${data.tierDistribution['2']} | T3: ${data.tierDistribution['3']}`);
    console.log(`  Orphans: ${data.orphans.length}`);
    console.log();
  }

  console.log('--- ORPHAN PAGES (< 2 INLINKS) ---');
  if (reportData.orphans.length === 0) {
    console.log('No orphan pages found.');
  } else {
    reportData.orphans.slice(0, 20).forEach(url => console.log(`- ${url}`));
    if (reportData.orphans.length > 20) {
      console.log(`... and ${reportData.orphans.length - 20} more`);
    }
  }
  console.log(`\nTotal orphans: ${reportData.orphans.length}`);

  if (reportData.underlinked.length > 0) {
    console.log('\n--- UNDERLINKED PRIORITY PAGES ---');
    reportData.underlinked.forEach(p => {
      console.log(`- ${p.url} [${p.inlinks} inlinks]`);
    });
  }

  if (reportData.overlinked.length > 0) {
    console.log('\n--- OVERLINKED PAGES (>50 inlinks) ---');
    reportData.overlinked.forEach(p => {
      console.log(`- ${p.url} [${p.inlinks} inlinks]`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
