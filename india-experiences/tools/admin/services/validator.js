import * as fileManager from './file-manager.js';

// Banned phrases from technical architecture
const BANNED_PHRASES = [
  'in conclusion',
  "it's worth noting",
  'delve into',
  'vibrant tapestry',
  'bustling metropolis',
  'hidden gem',
  'kaleidoscope of',
  'rich tapestry',
  'feast for the senses',
  'a must-visit',
  'nestled in',
  'whether you\'re a',
  'embark on a journey',
  'immerse yourself',
  'plethora of',
  'myriad of',
  'a testament to',
  'unparalleled',
  'breathtaking',
  'awe-inspiring',
  'unforgettable experience',
  'perfect blend of',
  'seamlessly blends',
  'caters to every taste'
];

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

    // 11. Check for banned phrases
    const contentLower = content.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (contentLower.includes(phrase.toLowerCase())) {
        errors.push({
          file: fileName,
          type: 'banned-phrase',
          message: `Contains banned phrase: "${phrase}"`
        });
      }
    }

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

  // Update content bank with validation results
  const contentBank = await fileManager.getContentBank(city);
  if (contentBank) {
    for (const page of contentBank.pages) {
      const pageErrors = errors.filter(e => e.file === `${page.slug}.md`);
      page.validationErrors = pageErrors;
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

  await fileManager.saveAdminState(adminState);

  return {
    totalFiles: files.length,
    errors,
    passed: files.length - new Set(errors.map(e => e.file)).size,
    failed: new Set(errors.map(e => e.file)).size
  };
}
