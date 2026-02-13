/**
 * Content Index - Tier-based internal linking for authority consolidation
 *
 * SEO GOVERNANCE RULES:
 *
 * TIER STRUCTURE:
 * - Tier 1: City hub pages - highest authority
 * - Tier 2: Guide/authority pages (food-guide, experiences, where-to-stay)
 * - Tier 3: Micro pages (PAA content, specific topics)
 *
 * LINKING RULES BY TIER:
 * | Page Tier | Must Link To                  | Related Links                           |
 * |-----------|-------------------------------|----------------------------------------|
 * | Tier 1    | All Tier 2 pages              | All Tier 3 (12 visible, rest collapsible) |
 * | Tier 2    | Hub + 3 other Tier 2          | Max 10 Tier 3 pages                    |
 * | Tier 3    | Hub + 5 Tier 2                | 6 related Tier 3 pages                 |
 *
 * AUTHORITY SHAPE PROTECTION:
 * Higher-tier pages must always have more inlinks than lower-tier pages.
 * Tier 3 pages should never exceed Tier 2 pages in inlink count.
 */

import type { CollectionEntry } from 'astro:content';
import { computePriority, type Tier } from './seo-governance';

export interface PageLink {
  href: string;
  title: string;
  priority: number;
  category: string;
  tags: string[];
  tier: Tier;
}

export interface AutoLinks {
  cityLinks: PageLink[];     // "In this city" - always link UP to hubs/guides
  relatedLinks: PageLink[];  // "Related" - tier-appropriate related content
  collapsibleLinks?: PageLink[]; // Additional links for Tier 1 pages (hidden by default)
}

/**
 * Build a searchable index from all pages
 * Priority is computed from tier, not stored manually
 */
export function buildContentIndex(
  pages: CollectionEntry<'pages'>[]
): Map<string, PageLink> {
  const index = new Map<string, PageLink>();

  for (const page of pages) {
    let url = '/' + page.id.replace(/\/_index$/, '').replace(/\.md$/, '') + '/';

    // Infer tier if not set (backward compatibility)
    const tier = (page.data.tier || inferTierFromPage(page)) as Tier;

    // Compute priority from tier and category
    const priority = computePriority({
      tier,
      category: page.data.category,
      type: page.data.type,
    });

    index.set(url, {
      href: url,
      title: page.data.title,
      priority,
      category: page.data.category,
      tags: page.data.tags ?? [],
      tier,
    });
  }

  return index;
}

/**
 * Infer tier from existing page data (for pages without tier field)
 */
function inferTierFromPage(page: CollectionEntry<'pages'>): Tier {
  if (page.data.type === 'hub') return '1';
  if (page.id.endsWith('_index')) return '1';
  if (page.data.priority && page.data.priority >= 9) return '2';
  if (page.data.type === 'category') return '2';
  return '3';
}

/**
 * Get "In this city" links - tier-based upward linking
 *
 * - Tier 1 (Hub): Links to ALL Tier 2 pages (this is how guides get authority)
 * - Tier 2 (Guide): Links to Hub + 3 most relevant other Tier 2 pages
 * - Tier 3 (Micro): Links to Hub + 5 Tier 2 pages (broader coverage)
 */
export function getCityLinks(
  index: Map<string, PageLink>,
  city: string,
  currentUrl: string,
  currentCategory: string,
  currentTier: Tier
): PageLink[] {
  const cityHub = `/${city}/`;
  const links: PageLink[] = [];

  // 1. Always include city hub (if not current page)
  const hub = index.get(cityHub);
  if (hub && cityHub !== currentUrl) {
    links.push(hub);
  }

  // 2. Get Tier 2 pages (guides/authority pages)
  const tier2Pages = Array.from(index.values())
    .filter(page =>
      page.href.startsWith(cityHub) &&
      page.href !== currentUrl &&
      page.href !== cityHub &&
      page.tier === '2'
    );

  // Sort alphabetically first, then rotate based on URL hash for even distribution
  // This ensures all Tier 2 pages get linked across the site
  const baseSorted = tier2Pages.sort((a, b) => a.title.localeCompare(b.title));

  // Use URL hash to determine rotation offset for even distribution
  const urlHash = currentUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotateOffset = urlHash % Math.max(1, baseSorted.length);
  const sortedTier2 = [
    ...baseSorted.slice(rotateOffset),
    ...baseSorted.slice(0, rotateOffset)
  ];

  // Tier 1 pages show ALL Tier 2 pages (this is how guides get linked)
  // Tier 2 pages show 3 other Tier 2 pages, Tier 3 shows 5 for better T2 coverage
  if (currentTier === '1') {
    links.push(...sortedTier2);
  } else if (currentTier === '2') {
    links.push(...sortedTier2.slice(0, 3));
  } else {
    // Tier 3 links to 5 Tier 2 pages for broader coverage
    links.push(...sortedTier2.slice(0, 5));
  }

  return links;
}

/**
 * Get related Tier 3 pages based on category and tags
 * Always returns up to `limit` pages to ensure connectivity
 */
function getRelatedTier3Pages(
  index: Map<string, PageLink>,
  city: string,
  category: string,
  tags: string[],
  currentUrl: string,
  excludeUrls: Set<string>,
  limit: number
): PageLink[] {
  const cityPrefix = `/${city}/`;
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  const candidates = Array.from(index.values())
    .filter(page =>
      page.href.startsWith(cityPrefix) &&
      page.href !== currentUrl &&
      !excludeUrls.has(page.href) &&
      page.tier === '3'
    )
    .map(page => {
      let score = 0;

      // Same category: +10
      if (page.category === category) score += 10;

      // Overlapping tags: +3 per tag
      for (const tag of page.tags) {
        if (tagSet.has(tag.toLowerCase())) score += 3;
      }

      // Small priority boost for relevance
      score += page.priority * 0.5;

      // Base score ensures all pages can be selected as fallback
      score += 1;

      return { page, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.page);

  return candidates;
}

/**
 * Get ALL Tier 3 pages for hub pages
 * Hubs link to every micro page to ensure no orphans
 */
function getAllTier3Pages(
  index: Map<string, PageLink>,
  city: string,
  currentUrl: string,
  excludeUrls: Set<string>
): { visible: PageLink[]; collapsible: PageLink[] } {
  const cityPrefix = `/${city}/`;

  const tier3Pages = Array.from(index.values())
    .filter(page =>
      page.href.startsWith(cityPrefix) &&
      page.href !== currentUrl &&
      !excludeUrls.has(page.href) &&
      page.tier === '3'
    )
    .sort((a, b) => {
      // Sort by category, then title for consistent ordering
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.title.localeCompare(b.title);
    });

  // First 12 visible, rest collapsible
  return {
    visible: tier3Pages.slice(0, 12),
    collapsible: tier3Pages.slice(12),
  };
}

/**
 * Main function: Get all auto-links for a page
 *
 * Tier-based linking:
 * - Tier 1: Hub + all Tier 2 | 12 Tier 3 visible + rest collapsible
 * - Tier 2: Hub + 3 Tier 2 | 10 Tier 3 pages
 * - Tier 3: Hub + 5 Tier 2 | 6 related Tier 3
 */
export function getAutoLinks(
  index: Map<string, PageLink>,
  city: string,
  category: string,
  tags: string[],
  currentUrl: string,
  manualRelatedPages?: string[],
  currentPriority: number = 5,
  currentTier?: Tier
): AutoLinks {
  // Determine tier from priority if not provided (backward compatibility)
  const tier: Tier = currentTier ||
    (currentPriority === 10 ? '1' : currentPriority >= 9 ? '2' : '3');

  // Get "In this city" links (hub + Tier 2 pages)
  const cityLinks = getCityLinks(index, city, currentUrl, category, tier);
  const cityUrls = new Set(cityLinks.map(l => l.href));

  let relatedLinks: PageLink[] = [];
  let collapsibleLinks: PageLink[] | undefined;

  if (tier === '1') {
    // TIER 1 (Hub): Link to ALL Tier 3 pages to ensure no orphans
    const tier3Result = getAllTier3Pages(index, city, currentUrl, cityUrls);
    relatedLinks = tier3Result.visible;
    collapsibleLinks = tier3Result.collapsible.length > 0 ? tier3Result.collapsible : undefined;

  } else if (tier === '2') {
    // TIER 2 (Guide): Max 10 Tier 3 pages for better coverage
    // Merge manual pages with auto-generated (manual first)
    const autoRelated = getRelatedTier3Pages(index, city, category, tags, currentUrl, cityUrls, 10);

    if (manualRelatedPages && manualRelatedPages.length > 0) {
      const manualLinks = manualRelatedPages
        .map(url => index.get(url))
        .filter((p): p is PageLink => p !== undefined && !cityUrls.has(p.href));

      const seen = new Set(manualLinks.map(l => l.href));
      const additionalAuto = autoRelated.filter(l => !seen.has(l.href));
      relatedLinks = [...manualLinks, ...additionalAuto].slice(0, 10);
    } else {
      relatedLinks = autoRelated;
    }

  } else {
    // TIER 3 (Micro): 6 related Tier 3 pages
    if (manualRelatedPages && manualRelatedPages.length > 0) {
      relatedLinks = manualRelatedPages
        .map(url => index.get(url))
        .filter((p): p is PageLink => p !== undefined && !cityUrls.has(p.href))
        .slice(0, 6);
    } else {
      relatedLinks = getRelatedTier3Pages(index, city, category, tags, currentUrl, cityUrls, 6);
    }
  }

  return { cityLinks, relatedLinks, collapsibleLinks };
}

/**
 * Format links for display
 */
export function formatLinksForDisplay(links: PageLink[]): { href: string; label: string }[] {
  return links.map(link => ({
    href: link.href,
    label: link.title,
  }));
}

/**
 * Calculate inlink counts for authority shape validation
 * Used by seo-validate.mjs to ensure Tier 2 > Tier 3 inlinks
 */
export function calculateInlinkCounts(
  index: Map<string, PageLink>,
  cities: string[]
): Map<string, number> {
  const inlinkCount = new Map<string, number>();

  // Initialize counts
  for (const url of index.keys()) {
    inlinkCount.set(url, 0);
  }

  // Calculate inlinks based on linking rules
  for (const page of index.values()) {
    const city = page.href.split('/')[1];
    if (!city || !cities.includes(city)) continue;

    const autoLinks = getAutoLinks(
      index,
      city,
      page.category,
      page.tags,
      page.href,
      undefined,
      page.priority,
      page.tier
    );

    // Count inlinks from city links
    for (const link of autoLinks.cityLinks) {
      inlinkCount.set(link.href, (inlinkCount.get(link.href) || 0) + 1);
    }

    // Count inlinks from related links
    for (const link of autoLinks.relatedLinks) {
      inlinkCount.set(link.href, (inlinkCount.get(link.href) || 0) + 1);
    }

    // Count inlinks from collapsible links
    if (autoLinks.collapsibleLinks) {
      for (const link of autoLinks.collapsibleLinks) {
        inlinkCount.set(link.href, (inlinkCount.get(link.href) || 0) + 1);
      }
    }
  }

  return inlinkCount;
}
