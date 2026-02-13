/**
 * SEO Governance System
 *
 * Enforces tier-based content hierarchy, automatic priority computation,
 * and linking rules for consistent authority consolidation.
 *
 * TIER STRUCTURE:
 * - Tier 1: City hub pages (_index.md) - priority 10
 * - Tier 2: Authority pages (guides, where-to-stay, experiences) - priority 9-10
 * - Tier 3: Micro pages (PAA content, specific topics) - priority 5
 *
 * MONEY PAGE RULES:
 * - where-to-stay and experiences MUST have priority 10
 * - These are the primary commercial landing pages
 * - Minimum 8 inlinks required, click depth <= 3
 *
 * AREA PAGE RULES:
 * - Pages under /city/where-to-stay/area-name/ must be Tier 3
 * - Category must be 'neighbourhoods', NOT 'where-to-stay'
 * - Only ONE Tier 2 where-to-stay page per city allowed
 */

export type Tier = '1' | '2' | '3';

export type GovernanceCategory =
  | 'hub'
  | 'guide'
  | 'micro'
  | 'where-to-stay'
  | 'experiences'
  | 'neighbourhoods'
  | 'things-to-do'
  | 'food-guide'
  | 'nightlife-guide'
  | 'day-trips'
  | 'heritage-guide'
  | 'safety-guide'
  // Legacy categories
  | 'general'
  | 'food'
  | 'heritage'
  | 'practical'
  | 'activities'
  | 'transport'
  | 'shopping'
  | 'culture'
  | 'wellness';

export interface PageData {
  tier?: Tier;
  category: string;
  type?: string;
  city?: string;
  priority?: number;
  id?: string;
  url?: string;
}

/**
 * MONEY PAGE CATEGORIES - Always priority 10
 * These are the primary commercial landing pages that drive conversions
 * Manual priority in frontmatter is IGNORED for these categories
 */
export const MONEY_PAGE_CATEGORIES = new Set([
  'hub',
  'where-to-stay',
  'experiences',
]);

/**
 * Categories/patterns that indicate Tier 2 authority pages
 */
export const TIER_2_PATTERNS = [
  'food-guide',
  'things-to-do',
  'neighbourhoods',
  'nightlife-guide',
  'day-trips',
  'heritage-guide',
  'safety-guide',
  'experiences',
  'where-to-stay',
];

/**
 * Compute priority from tier + category
 * Priority is computed, not manually set - this ensures consistency
 *
 * RULES (in order):
 * 1. category === 'hub' → priority = 10
 * 2. category === 'where-to-stay' → priority = 10
 * 3. category === 'experiences' → priority = 10
 * 4. tier === '2' → priority = 9
 * 5. tier === '3' → priority = 5
 *
 * Manual frontmatter priority is IGNORED for money page categories.
 */
export function computePriority(page: PageData): number {
  // Money page categories ALWAYS get priority 10
  if (MONEY_PAGE_CATEGORIES.has(page.category)) {
    return 10;
  }

  // Hub pages are always priority 10
  if (page.type === 'hub') {
    return 10;
  }

  // Tier 1 always priority 10
  if (page.tier === '1') {
    return 10;
  }

  // Tier 2 gets priority 9
  if (page.tier === '2') {
    return 9;
  }

  // Default: Tier 3 micro pages get priority 5
  return 5;
}

/**
 * Check if a page is a money page (where-to-stay or experiences)
 */
export function isMoneyPage(category: string): boolean {
  return category === 'where-to-stay' || category === 'experiences';
}

/**
 * Check if a page is an area page (nested under where-to-stay)
 * Area pages should be tier 3 with category 'neighbourhoods'
 */
export function isAreaPage(url: string): boolean {
  // Match pattern: /city/where-to-stay/something/
  const parts = url.split('/').filter(Boolean);
  return parts.length >= 3 && parts[1] === 'where-to-stay';
}

/**
 * Get URL depth (number of path segments)
 */
export function getUrlDepth(url: string): number {
  return url.split('/').filter(Boolean).length;
}

/**
 * Infer tier from existing page data (used for migration)
 */
export function inferTier(page: PageData): Tier {
  // Hub pages are always Tier 1
  if (page.type === 'hub' || page.category === 'hub') {
    return '1';
  }

  // Check for _index.md pattern (city hub pages)
  if (page.id && page.id.endsWith('_index')) {
    return '1';
  }

  // Check for Tier 2 patterns in category
  if (TIER_2_PATTERNS.includes(page.category)) {
    return '2';
  }

  // Check for guide-type pages based on existing priority
  if (page.priority && page.priority >= 9) {
    return '2';
  }

  // Default: Tier 3 micro pages
  return '3';
}

/**
 * Validate tier assignment is correct
 * Returns error message if invalid, null if valid
 */
export function validateTier(page: PageData): string | null {
  if (!page.tier) {
    return `Missing required field: tier`;
  }

  if (!['1', '2', '3'].includes(page.tier)) {
    return `Invalid tier value: ${page.tier}. Must be '1', '2', or '3'`;
  }

  // Tier 1 must be hub pages only
  if (page.tier === '1' && page.type !== 'hub' && page.category !== 'hub') {
    if (!page.id?.endsWith('_index')) {
      return `Tier 1 is reserved for hub pages only. Page type: ${page.type}, category: ${page.category}`;
    }
  }

  return null;
}

/**
 * Validate money page has correct priority
 * Build MUST fail if money pages don't have priority 10
 */
export function validateMoneyPagePriority(page: PageData, computedPriority: number): string | null {
  if (isMoneyPage(page.category) && computedPriority !== 10) {
    return `Money page ${page.url || page.id} must have priority 10, got ${computedPriority}`;
  }
  return null;
}

/**
 * Validate area page structure
 * Area pages under /where-to-stay/ must be tier 3 with category neighbourhoods
 */
export function validateAreaPage(page: PageData): string | null {
  const url = page.url || '';

  if (isAreaPage(url)) {
    // Area page must be Tier 3
    if (page.tier !== '3') {
      return `Area page ${url} must be tier "3", got "${page.tier}"`;
    }
    // Area page category should be neighbourhoods, NOT where-to-stay
    if (page.category === 'where-to-stay') {
      return `Area page ${url} must have category "neighbourhoods", not "where-to-stay"`;
    }
  }

  // where-to-stay category pages must be at depth 2 (e.g., /delhi/where-to-stay/)
  if (page.category === 'where-to-stay') {
    const depth = getUrlDepth(url);
    if (depth > 2) {
      return `where-to-stay category page ${url} has depth ${depth}, must be 2. Use category "neighbourhoods" for area pages.`;
    }
  }

  return null;
}

/**
 * Required fields for SEO governance
 */
export const REQUIRED_FIELDS = ['city', 'tier', 'category'] as const;

/**
 * Check if page has all required fields
 */
export function getMissingRequiredFields(page: Record<string, unknown>): string[] {
  return REQUIRED_FIELDS.filter(field => !page[field]);
}

/**
 * Money page requirements
 */
export const MONEY_PAGE_REQUIREMENTS = {
  minInlinks: 8,
  maxClickDepth: 3,
} as const;

/**
 * Linking limits by tier
 */
export const LINKING_RULES = {
  '1': {
    tier2Limit: Infinity,
    tier3Visible: 12,
    tier3Total: Infinity,
  },
  '2': {
    tier2Limit: 3,
    tier3Visible: 10,
    tier3Total: 10,
  },
  '3': {
    tier2Limit: 5,
    tier3Visible: 6,
    tier3Total: 6,
  },
} as const;

/**
 * Get linking limits for a tier
 */
export function getLinkingLimits(tier: Tier) {
  return LINKING_RULES[tier];
}

/**
 * Required Tier 2 pages for each city
 */
export const REQUIRED_TIER_2_PAGES = [
  'where-to-stay',
  'experiences',
] as const;

/**
 * Check if a city has all required Tier 2 pages
 */
export function getMissingTier2Pages(cityPages: string[], city: string): string[] {
  const missing: string[] = [];

  for (const required of REQUIRED_TIER_2_PAGES) {
    const hasPage = cityPages.some(slug =>
      slug === `/${city}/${required}/` ||
      slug === `${city}/${required}` ||
      slug.endsWith(`/${required}/`) ||
      slug.endsWith(`/${required}`)
    );

    if (!hasPage) {
      missing.push(required);
    }
  }

  return missing;
}
