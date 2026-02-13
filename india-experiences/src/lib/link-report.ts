/**
 * Link Analysis Report
 * Generates diagnostic report during build to verify internal linking strategy
 *
 * Run: npx ts-node --esm src/lib/link-report.ts
 * Or import and call generateLinkReport() during build
 */

import type { CollectionEntry } from 'astro:content';
import { buildContentIndex, getAutoLinks, type PageLink } from './content-index';

interface LinkReport {
  topInlinked: { url: string; title: string; inlinks: number }[];
  orphans: { url: string; title: string }[];
  avgDepthToStays: number | null;
  avgDepthToExperiences: number | null;
  totalPages: number;
  totalLinks: number;
}

/**
 * Count inlinks for each page
 */
function countInlinks(
  pages: CollectionEntry<'pages'>[],
  index: Map<string, PageLink>
): Map<string, number> {
  const inlinkCount = new Map<string, number>();

  // Initialize all pages with 0
  for (const url of index.keys()) {
    inlinkCount.set(url, 0);
  }

  // Count inlinks from auto-links
  for (const page of pages) {
    const city = page.data.city;
    if (!city) continue;

    let url = '/' + page.id.replace(/\/_index$/, '').replace(/\.md$/, '') + '/';

    const autoLinks = getAutoLinks(
      index,
      city,
      page.data.category,
      page.data.tags ?? [],
      url,
      page.data.relatedPages
    );

    // Count links from core and related
    for (const link of [...autoLinks.coreLinks, ...autoLinks.relatedLinks]) {
      const current = inlinkCount.get(link.href) ?? 0;
      inlinkCount.set(link.href, current + 1);
    }
  }

  return inlinkCount;
}

/**
 * Calculate average click depth to target pages using BFS
 */
function calculateAvgDepth(
  pages: CollectionEntry<'pages'>[],
  index: Map<string, PageLink>,
  targetPattern: string
): number | null {
  // Find target pages
  const targetUrls = Array.from(index.keys()).filter(url => url.includes(targetPattern));

  if (targetUrls.length === 0) {
    return null;
  }

  // Build adjacency list (outgoing links from each page)
  const adjacency = new Map<string, string[]>();

  for (const page of pages) {
    const city = page.data.city;
    if (!city) continue;

    let url = '/' + page.id.replace(/\/_index$/, '').replace(/\.md$/, '') + '/';

    const autoLinks = getAutoLinks(
      index,
      city,
      page.data.category,
      page.data.tags ?? [],
      url,
      page.data.relatedPages
    );

    const outlinks = [...autoLinks.coreLinks, ...autoLinks.relatedLinks].map(l => l.href);
    adjacency.set(url, outlinks);
  }

  // BFS from each city hub to find depths
  const cityHubs = Array.from(index.keys()).filter(url => {
    const parts = url.split('/').filter(Boolean);
    return parts.length === 1; // e.g., /delhi/
  });

  let totalDepth = 0;
  let reachableCount = 0;

  for (const hub of cityHubs) {
    // BFS from this hub
    const depths = new Map<string, number>();
    const queue: { url: string; depth: number }[] = [{ url: hub, depth: 0 }];
    depths.set(hub, 0);

    while (queue.length > 0) {
      const { url, depth } = queue.shift()!;
      const neighbors = adjacency.get(url) ?? [];

      for (const neighbor of neighbors) {
        if (!depths.has(neighbor)) {
          depths.set(neighbor, depth + 1);
          queue.push({ url: neighbor, depth: depth + 1 });
        }
      }
    }

    // Check depths to target pages in this city
    for (const target of targetUrls) {
      if (target.startsWith(hub.slice(0, -1))) { // Same city
        const depth = depths.get(target);
        if (depth !== undefined) {
          totalDepth += depth;
          reachableCount++;
        }
      }
    }
  }

  return reachableCount > 0 ? totalDepth / reachableCount : null;
}

/**
 * Generate the full link analysis report
 */
export function generateLinkReport(pages: CollectionEntry<'pages'>[]): LinkReport {
  const index = buildContentIndex(pages);
  const inlinkCount = countInlinks(pages, index);

  // Top 20 by inlinks
  const sortedByInlinks = Array.from(inlinkCount.entries())
    .map(([url, count]) => ({
      url,
      title: index.get(url)?.title ?? url,
      inlinks: count,
    }))
    .sort((a, b) => b.inlinks - a.inlinks)
    .slice(0, 20);

  // Orphans (0 inlinks, excluding hubs which don't need inlinks)
  const orphans = Array.from(inlinkCount.entries())
    .filter(([url, count]) => {
      const parts = url.split('/').filter(Boolean);
      return count === 0 && parts.length > 1; // Not a city hub
    })
    .map(([url]) => ({
      url,
      title: index.get(url)?.title ?? url,
    }));

  // Average depth calculations
  const avgDepthToStays = calculateAvgDepth(pages, index, '/stays');
  const avgDepthToExperiences = calculateAvgDepth(pages, index, '/experiences');

  // Total link count
  let totalLinks = 0;
  for (const count of inlinkCount.values()) {
    totalLinks += count;
  }

  return {
    topInlinked: sortedByInlinks,
    orphans,
    avgDepthToStays,
    avgDepthToExperiences,
    totalPages: index.size,
    totalLinks,
  };
}

/**
 * Print report to console
 */
export function printLinkReport(report: LinkReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('INTERNAL LINK ANALYSIS REPORT');
  console.log('='.repeat(60));

  console.log(`\nTotal Pages: ${report.totalPages}`);
  console.log(`Total Internal Links: ${report.totalLinks}`);
  console.log(`Avg Links per Page: ${(report.totalLinks / report.totalPages).toFixed(1)}`);

  console.log('\n--- TOP 20 PAGES BY INLINKS ---');
  console.log('(These pages receive the most internal link equity)\n');
  report.topInlinked.forEach((page, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. [${page.inlinks.toString().padStart(3)} links] ${page.url}`);
    console.log(`     ${page.title}`);
  });

  console.log('\n--- ORPHAN PAGES (0 INLINKS) ---');
  console.log('(These pages receive no internal links - consider linking to them)\n');
  if (report.orphans.length === 0) {
    console.log('No orphan pages found.');
  } else {
    report.orphans.slice(0, 30).forEach(page => {
      console.log(`- ${page.url}`);
    });
    if (report.orphans.length > 30) {
      console.log(`... and ${report.orphans.length - 30} more`);
    }
  }

  console.log('\n--- CLICK DEPTH TO MONEY PAGES ---');
  console.log('(Lower is better - how many clicks from city hub to reach these)\n');
  if (report.avgDepthToStays !== null) {
    console.log(`Avg depth to /stays/ pages: ${report.avgDepthToStays.toFixed(2)} clicks`);
  } else {
    console.log('Avg depth to /stays/ pages: N/A (no stays pages found)');
  }
  if (report.avgDepthToExperiences !== null) {
    console.log(`Avg depth to /experiences/ pages: ${report.avgDepthToExperiences.toFixed(2)} clicks`);
  } else {
    console.log('Avg depth to /experiences/ pages: N/A (no experiences pages found)');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}
