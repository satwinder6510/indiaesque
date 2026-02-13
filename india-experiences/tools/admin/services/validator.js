import * as fileManager from './file-manager.js';
import { detectStructuralPatterns, formatStructuralErrors } from './structural-detector.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load banned phrases from JSON
let BANNED_PHRASES_DATA = null;

async function loadBannedPhrases() {
  if (BANNED_PHRASES_DATA) return BANNED_PHRASES_DATA;

  try {
    const phrasesPath = path.join(__dirname, '..', '..', '..', 'data', 'banned-phrases.json');
    const data = await fs.readFile(phrasesPath, 'utf-8');
    BANNED_PHRASES_DATA = JSON.parse(data);
    return BANNED_PHRASES_DATA;
  } catch (err) {
    console.error('Failed to load banned-phrases.json:', err.message);
    // Fallback to basic list
    return {
      categories: {
        legacy: {
          weight: 5,
          phrases: [
            'in conclusion', "it's worth noting", 'delve into', 'vibrant tapestry',
            'bustling metropolis', 'hidden gem', 'rich tapestry', 'feast for the senses',
            'must-visit', 'embark on a journey', 'immerse yourself', 'plethora of',
            'myriad of', 'unparalleled', 'breathtaking', 'unforgettable experience'
          ]
        }
      }
    };
  }
}

// Find line number for a phrase match
function findLineNumber(content, phrase) {
  const lines = content.split('\n');
  const phraseLower = phrase.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(phraseLower)) {
      return i + 1;
    }
  }
  return null;
}

// Count occurrences of a phrase
function countOccurrences(content, phrase) {
  const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

// Calculate AI detection score for a piece of content
function calculateAIScore(phraseViolations) {
  let totalScore = 0;
  const categoryScores = {};

  for (const violation of phraseViolations) {
    const { category, weight, count } = violation;

    // First occurrence: full weight
    // Repeat occurrences: weight × 1.5
    let points = weight;
    if (count > 1) {
      points += (count - 1) * (weight * 0.5);
    }

    if (!categoryScores[category]) {
      categoryScores[category] = { points: 0, count: 0 };
    }
    categoryScores[category].points += points;
    categoryScores[category].count += count;
    totalScore += points;
  }

  // Apply multiplier if 5+ total violations
  const totalViolations = phraseViolations.reduce((sum, v) => sum + v.count, 0);
  if (totalViolations >= 5) {
    totalScore = Math.round(totalScore * 1.3);
  }

  return {
    total: Math.min(100, Math.round(totalScore)),
    categoryScores,
    violationCount: totalViolations
  };
}

// Get rating from score
function getScoreRating(score) {
  if (score <= 10) return { rating: 'excellent', badge: '✅', action: 'publish' };
  if (score <= 20) return { rating: 'good', badge: '✅', action: 'quick-review' };
  if (score <= 35) return { rating: 'fair', badge: '⚠️', action: 'needs-editing' };
  if (score <= 50) return { rating: 'poor', badge: '🔶', action: 'needs-rewrite' };
  if (score <= 70) return { rating: 'bad', badge: '❌', action: 'major-rewrite' };
  return { rating: 'fail', badge: '❌❌', action: 'regenerate' };
}

// Check content for banned phrases with categorization
async function checkBannedPhrases(content, fileName) {
  const phrasesData = await loadBannedPhrases();
  const contentLower = content.toLowerCase();
  const violations = [];
  const errors = [];

  for (const [categoryKey, categoryData] of Object.entries(phrasesData.categories)) {
    const { phrases, weight, description } = categoryData;

    for (const phrase of phrases) {
      const count = countOccurrences(contentLower, phrase.toLowerCase());
      if (count > 0) {
        const lineNumber = findLineNumber(content, phrase);

        violations.push({
          category: categoryKey,
          categoryDescription: description,
          phrase,
          weight,
          count,
          line: lineNumber
        });

        errors.push({
          file: fileName,
          type: 'banned-phrase',
          category: categoryKey,
          weight,
          line: lineNumber,
          message: `[${categoryKey}] "${phrase}" (weight: ${weight}, count: ${count}${lineNumber ? `, line: ${lineNumber}` : ''})`
        });
      }
    }
  }

  const aiScore = calculateAIScore(violations);
  const rating = getScoreRating(aiScore.total);

  return {
    violations,
    errors,
    aiScore: {
      ...aiScore,
      ...rating
    }
  };
}

// Export helper functions for use by other modules
export { loadBannedPhrases, checkBannedPhrases, calculateAIScore, getScoreRating };

// Minimum word counts by page type
const MIN_WORD_COUNTS = {
  hub: 2500,
  category: 1500,
  paa: 600
};

// Valid enums
const VALID_TYPES = ['hub', 'category', 'paa', 'blog'];
const VALID_STATUSES = ['machine-draft', 'published', 'human-edited'];

export async function validator(options) {
  const { city } = options;
  const errors = [];
  let fileAIScores = {};

  // Get all content files for the city
  const files = await fileManager.getContentFiles(city);
  const cities = await fileManager.getCities();
  const categories = await fileManager.getCategories();

  const validCitySlugs = cities.map(c => c.slug);
  const validCategorySlugs = categories.map(c => c.slug);

  // Build a map of all existing pages for link checking
  const existingPages = new Set();
  for (const slug of files) {
    existingPages.add(`/${city}/${slug}/`);
    existingPages.add(`/${city}/${slug}`);
  }
  existingPages.add(`/${city}/`);

  // Validate each file
  for (const slug of files) {
    const file = await fileManager.readContentFile(city, slug);
    if (!file) continue;

    const { frontmatter, content } = file;
    const fileName = `${slug}.md`;

    // 1. Title length check (≤60 characters)
    if (frontmatter.title) {
      if (frontmatter.title.length > 60) {
        errors.push({
          file: fileName,
          type: 'title-length',
          message: `Title is ${frontmatter.title.length} chars (max 60): "${frontmatter.title.substring(0, 40)}..."`
        });
      }
    } else {
      errors.push({
        file: fileName,
        type: 'missing-title',
        message: 'Missing title in frontmatter'
      });
    }

    // 2. Description length check (120-155 characters)
    if (frontmatter.description) {
      const descLen = frontmatter.description.length;
      if (descLen < 120) {
        errors.push({
          file: fileName,
          type: 'description-short',
          message: `Description is ${descLen} chars (min 120)`
        });
      } else if (descLen > 155) {
        errors.push({
          file: fileName,
          type: 'description-long',
          message: `Description is ${descLen} chars (max 155)`
        });
      }
    } else {
      errors.push({
        file: fileName,
        type: 'missing-description',
        message: 'Missing description in frontmatter'
      });
    }

    // 3. Valid city slug
    if (frontmatter.city && !validCitySlugs.includes(frontmatter.city)) {
      errors.push({
        file: fileName,
        type: 'invalid-city',
        message: `Invalid city slug: "${frontmatter.city}"`
      });
    }

    // 4. Valid type enum
    if (frontmatter.type && !VALID_TYPES.includes(frontmatter.type)) {
      errors.push({
        file: fileName,
        type: 'invalid-type',
        message: `Invalid type: "${frontmatter.type}" (valid: ${VALID_TYPES.join(', ')})`
      });
    }

    // 5. Valid status enum
    if (frontmatter.status && !VALID_STATUSES.includes(frontmatter.status)) {
      errors.push({
        file: fileName,
        type: 'invalid-status',
        message: `Invalid status: "${frontmatter.status}" (valid: ${VALID_STATUSES.join(', ')})`
      });
    }

    // 6. Schema array populated
    if (!frontmatter.schema || !Array.isArray(frontmatter.schema) || frontmatter.schema.length === 0) {
      errors.push({
        file: fileName,
        type: 'missing-schema',
        message: 'Schema array is empty or missing'
      });
    }

    // 7. FAQ array with ≥2 entries (for pages with FAQ schema)
    if (frontmatter.schema?.includes('FAQPage')) {
      if (!frontmatter.faq || !Array.isArray(frontmatter.faq) || frontmatter.faq.length < 2) {
        errors.push({
          file: fileName,
          type: 'insufficient-faq',
          message: `FAQPage schema requires ≥2 FAQ entries (found ${frontmatter.faq?.length || 0})`
        });
      }
    }

    // 8. Word count minimums
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const pageType = frontmatter.type || 'paa';
    const minWords = MIN_WORD_COUNTS[pageType] || 600;

    if (wordCount < minWords) {
      errors.push({
        file: fileName,
        type: 'word-count',
        message: `Word count is ${wordCount} (min ${minWords} for ${pageType})`
      });
    }

    // 9. Internal links check (≥3)
    const internalLinkPattern = /\[([^\]]+)\]\(\/[^)]+\)/g;
    const internalLinks = content.match(internalLinkPattern) || [];

    if (internalLinks.length < 3) {
      errors.push({
        file: fileName,
        type: 'insufficient-links',
        message: `Only ${internalLinks.length} internal links (min 3)`
      });
    }

    // 10. Check for broken internal links
    const linkHrefPattern = /\]\((\/[^)]+)\)/g;
    let match;
    while ((match = linkHrefPattern.exec(content)) !== null) {
      const href = match[1].replace(/\/$/, ''); // Remove trailing slash for comparison
      const hrefWithSlash = href + '/';

      // Check if target exists
      if (!existingPages.has(href) && !existingPages.has(hrefWithSlash)) {
        // Check if it's a known city hub or category
        const isKnownPath = validCitySlugs.some(c => href === `/${c}` || href === `/${c}/`) ||
                           href === '/' ||
                           href.includes('/food-tours') ||
                           href.includes('/heritage-walks') ||
                           href.includes('/markets-shopping') ||
                           href.includes('/day-trips') ||
                           href.includes('/experiences');

        if (!isKnownPath) {
          errors.push({
            file: fileName,
            type: 'broken-link',
            message: `Potentially broken link: ${href}`
          });
        }
      }
    }

    // 11. Check for banned phrases (with AI scoring)
    const phraseCheck = await checkBannedPhrases(content, fileName);
    errors.push(...phraseCheck.errors);

    // 11b. Check for structural patterns
    const cityInfo = cities.find(c => c.slug === city);
    const structuralCheck = await detectStructuralPatterns(content, {
      cityName: cityInfo?.name || city,
      fileName
    });
    const structuralErrors = formatStructuralErrors(structuralCheck, fileName);
    errors.push(...structuralErrors);

    // Combine phrase and structural scores
    const combinedScore = Math.min(100,
      phraseCheck.aiScore.total + structuralCheck.score.capped
    );
    const combinedRating = getScoreRating(combinedScore);

    // Store combined AI score for this file
    if (!fileAIScores) fileAIScores = {};
    fileAIScores[fileName] = {
      total: combinedScore,
      ...combinedRating,
      breakdown: {
        phrases: phraseCheck.aiScore.total,
        structural: structuralCheck.score.capped
      },
      phraseViolations: phraseCheck.aiScore.violationCount,
      structuralViolations: structuralCheck.score.violationCount
    };

    // 12. PAA pages: first paragraph should answer the question
    if (pageType === 'paa') {
      const firstParagraph = content.split('\n\n')[0] || '';
      if (firstParagraph.length < 100) {
        errors.push({
          file: fileName,
          type: 'weak-opening',
          message: 'First paragraph is too short to be a featured snippet answer'
        });
      }
      if (!firstParagraph.includes('**')) {
        errors.push({
          file: fileName,
          type: 'missing-bold-answer',
          message: 'PAA page should have bold direct answer in first paragraph'
        });
      }
    }

    // 13. Parent page check
    if (frontmatter.parentPage) {
      const parentPath = frontmatter.parentPage.replace(/\/$/, '');
      if (!existingPages.has(parentPath) && !existingPages.has(parentPath + '/')) {
        // Allow city hub as parent even if not generated yet
        if (!validCitySlugs.some(c => parentPath === `/${c}`)) {
          errors.push({
            file: fileName,
            type: 'invalid-parent',
            message: `Parent page doesn't exist: ${frontmatter.parentPage}`
          });
        }
      }
    }

    // 14. Related pages check
    if (frontmatter.relatedPages && Array.isArray(frontmatter.relatedPages)) {
      for (const related of frontmatter.relatedPages) {
        const relatedPath = related.replace(/\/$/, '');
        if (!existingPages.has(relatedPath) && !existingPages.has(relatedPath + '/')) {
          // Only warn, don't error, as related pages might be generated later
          // This is a soft check
        }
      }
    }
  }

  // Calculate AI score summary
  const aiScoreSummary = calculateAIScoreSummary(fileAIScores);

  // Update content bank with validation results and AI scores
  const contentBank = await fileManager.getContentBank(city);
  if (contentBank) {
    for (const page of contentBank.pages) {
      const pageErrors = errors.filter(e => e.file === `${page.slug}.md`);
      const pageAIScore = fileAIScores[`${page.slug}.md`];
      page.validationErrors = pageErrors;
      page.aiScore = pageAIScore;
      if (pageErrors.length === 0 && page.status === 'generated') {
        page.status = 'validated';
      }
    }
    await fileManager.saveContentBank(city, contentBank);
  }

  // Update admin state
  const adminState = await fileManager.getAdminState();
  if (!adminState.cities) adminState.cities = {};
  if (!adminState.cities[city]) adminState.cities[city] = {};

  adminState.cities[city].validatedCount = files.length - errors.filter(e => e.type !== 'banned-phrase').length;
  adminState.cities[city].lastValidated = new Date().toISOString();
  adminState.cities[city].aiScoreSummary = aiScoreSummary;

  await fileManager.saveAdminState(adminState);

  return {
    totalFiles: files.length,
    errors,
    passed: files.length - new Set(errors.map(e => e.file)).size,
    failed: new Set(errors.map(e => e.file)).size,
    aiScores: fileAIScores,
    aiScoreSummary
  };
}

// Calculate summary statistics for AI scores
function calculateAIScoreSummary(fileAIScores) {
  const scores = Object.values(fileAIScores).map(s => s.total);

  if (scores.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: { excellent: 0, good: 0, fair: 0, poor: 0, bad: 0, fail: 0 },
      readyToPublish: 0,
      needsEditing: 0,
      needsRegeneration: 0
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);

  const distribution = {
    excellent: scores.filter(s => s <= 10).length,
    good: scores.filter(s => s > 10 && s <= 20).length,
    fair: scores.filter(s => s > 20 && s <= 35).length,
    poor: scores.filter(s => s > 35 && s <= 50).length,
    bad: scores.filter(s => s > 50 && s <= 70).length,
    fail: scores.filter(s => s > 70).length
  };

  return {
    average: Math.round(sum / scores.length),
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    distribution,
    readyToPublish: distribution.excellent + distribution.good,
    needsEditing: distribution.fair + distribution.poor,
    needsRegeneration: distribution.bad + distribution.fail
  };
}
