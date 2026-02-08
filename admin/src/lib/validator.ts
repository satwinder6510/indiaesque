import matter from "gray-matter";

export interface ValidationError {
  type: string;
  message: string;
  value?: string | number;
  limit?: number;
  actual?: number;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Banned phrases from the technical architecture
export const BANNED_PHRASES = [
  "in conclusion",
  "it's worth noting",
  "delve into",
  "vibrant tapestry",
  "bustling metropolis",
  "hidden gem",
  "kaleidoscope of",
  "rich tapestry",
  "feast for the senses",
  "a must-visit",
  "nestled in",
  "whether you're a",
  "from ... to ...",
  "embark on a journey",
  "immerse yourself",
  "plethora of",
  "myriad of",
  "a testament to",
  "unparalleled",
  "breathtaking",
  "awe-inspiring",
  "unforgettable experience",
  "perfect blend of",
  "seamlessly blends",
  "caters to every taste",
];

// Valid categories
export const VALID_CATEGORIES = [
  "general",
  "food",
  "heritage",
  "markets",
  "culture",
  "nature",
  "spiritual",
  "nightlife",
  "practical",
];

// Word count requirements by page type
export const WORD_COUNT_REQUIREMENTS = {
  paa: 600,
  category: 1500,
  hub: 2500,
};

/**
 * Validate a Markdown content file
 */
export function validateContent(
  markdown: string,
  existingPages: string[],
  validCities: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  let frontmatter: Record<string, unknown>;
  let content: string;

  try {
    const parsed = matter(markdown);
    frontmatter = parsed.data as Record<string, unknown>;
    content = parsed.content;
  } catch {
    return {
      valid: false,
      errors: [{ type: "parse-error", message: "Failed to parse frontmatter" }],
      warnings: [],
    };
  }

  // Title validation
  const title = frontmatter.title as string | undefined;
  if (!title) {
    errors.push({ type: "missing-title", message: "Title is required" });
  } else if (title.length > 60) {
    errors.push({
      type: "title-too-long",
      message: "Title must be under 60 characters",
      value: title,
      limit: 60,
      actual: title.length,
    });
  }

  // Description validation
  const description = frontmatter.description as string | undefined;
  if (!description) {
    errors.push({
      type: "missing-description",
      message: "Description is required",
    });
  } else if (description.length < 120) {
    errors.push({
      type: "description-too-short",
      message: "Description must be at least 120 characters",
      value: description,
      limit: 120,
      actual: description.length,
    });
  } else if (description.length > 155) {
    errors.push({
      type: "description-too-long",
      message: "Description must be under 155 characters",
      value: description,
      limit: 155,
      actual: description.length,
    });
  }

  // City validation
  const city = frontmatter.city as string | undefined;
  if (!city) {
    errors.push({ type: "missing-city", message: "City is required" });
  } else if (!validCities.includes(city)) {
    warnings.push({
      type: "invalid-city",
      message: `City "${city}" not in valid cities list`,
      value: city,
    });
  }

  // Category validation
  const category = frontmatter.category as string | undefined;
  if (!category) {
    errors.push({ type: "missing-category", message: "Category is required" });
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.push({
      type: "invalid-category",
      message: `Invalid category "${category}"`,
      value: category,
    });
  }

  // Type validation
  const type = frontmatter.type as string | undefined;
  if (!type) {
    errors.push({ type: "missing-type", message: "Type is required" });
  } else if (!["hub", "category", "paa", "blog"].includes(type)) {
    errors.push({
      type: "invalid-type",
      message: `Invalid type "${type}"`,
      value: type,
    });
  }

  // Status validation
  const status = frontmatter.status as string | undefined;
  if (!status) {
    errors.push({ type: "missing-status", message: "Status is required" });
  } else if (!["machine-draft", "published", "human-edited"].includes(status)) {
    errors.push({
      type: "invalid-status",
      message: `Invalid status "${status}"`,
      value: status,
    });
  }

  // Schema validation
  const schema = frontmatter.schema as string[] | undefined;
  if (!schema || !Array.isArray(schema) || schema.length === 0) {
    errors.push({
      type: "missing-schema",
      message: "Schema array is required and must not be empty",
    });
  }

  // FAQ validation
  const faq = frontmatter.faq as
    | { question: string; answer: string }[]
    | undefined;
  if (!faq || !Array.isArray(faq) || faq.length < 2) {
    warnings.push({
      type: "insufficient-faq",
      message: "FAQ should have at least 2 entries",
      actual: faq?.length || 0,
    });
  }

  // Word count validation (warning, not error)
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  const pageType = type as "hub" | "category" | "paa" | undefined;
  if (pageType && pageType in WORD_COUNT_REQUIREMENTS) {
    const required =
      WORD_COUNT_REQUIREMENTS[pageType as keyof typeof WORD_COUNT_REQUIREMENTS];
    if (wordCount < required) {
      warnings.push({
        type: "word-count-low",
        message: `Word count below recommended for ${pageType} pages`,
        limit: required,
        actual: wordCount,
      });
    }
  }

  // Internal links validation (warning, not error)
  const internalLinks = content.match(/\]\(\/[^)]+\)/g) || [];
  if (internalLinks.length < 3) {
    warnings.push({
      type: "insufficient-internal-links",
      message: "Content should have at least 3 internal links",
      limit: 3,
      actual: internalLinks.length,
    });
  }

  // Validate internal links point to existing pages
  const relatedPages = frontmatter.relatedPages as string[] | undefined;
  if (relatedPages) {
    for (const page of relatedPages) {
      // Normalize the page path for comparison
      const normalizedPage = page.replace(/\/$/, "").replace(/^\//, "");
      const pageExists = existingPages.some(
        (p) => p.replace(/\/$/, "").replace(/^\//, "") === normalizedPage
      );
      if (!pageExists) {
        warnings.push({
          type: "broken-related-link",
          message: `Related page does not exist: ${page}`,
          value: page,
        });
      }
    }
  }

  // Banned phrases check
  const contentLower = content.toLowerCase();
  const lines = content.split("\n");

  for (const phrase of BANNED_PHRASES) {
    const phraseLower = phrase.toLowerCase();
    if (contentLower.includes(phraseLower)) {
      // Find line number
      let lineNum = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(phraseLower)) {
          lineNum = i + 1;
          break;
        }
      }
      errors.push({
        type: "banned-phrase",
        message: `Banned phrase found: "${phrase}"`,
        value: phrase,
        line: lineNum,
      });
    }
  }

  // PAA first paragraph check
  if (type === "paa") {
    const firstParagraph = content.split("\n\n")[0];
    if (!firstParagraph.startsWith("**")) {
      warnings.push({
        type: "paa-no-direct-answer",
        message:
          "PAA pages should start with a bold direct answer to the question",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Auto-fix certain validation errors
 */
export function autoFix(
  markdown: string
): { fixed: string; fixedIssues: string[] } {
  const fixedIssues: string[] = [];
  let fixed = markdown;

  const parsed = matter(fixed);
  const frontmatter = parsed.data as Record<string, unknown>;
  let changed = false;

  // Trim title if too long
  const title = frontmatter.title as string | undefined;
  if (title && title.length > 60) {
    // Try to trim at a word boundary
    let trimmed = title.slice(0, 57) + "...";
    const lastSpace = title.slice(0, 57).lastIndexOf(" ");
    if (lastSpace > 40) {
      trimmed = title.slice(0, lastSpace) + "...";
    }
    frontmatter.title = trimmed;
    fixedIssues.push(`Trimmed title from ${title.length} to ${trimmed.length} characters`);
    changed = true;
  }

  // Fix description length
  const description = frontmatter.description as string | undefined;
  if (description) {
    if (description.length > 155) {
      let trimmed = description.slice(0, 152) + "...";
      const lastSpace = description.slice(0, 152).lastIndexOf(" ");
      if (lastSpace > 120) {
        trimmed = description.slice(0, lastSpace) + "...";
      }
      frontmatter.description = trimmed;
      fixedIssues.push(
        `Trimmed description from ${description.length} to ${trimmed.length} characters`
      );
      changed = true;
    }
  }

  if (changed) {
    fixed = matter.stringify(parsed.content, frontmatter);
  }

  return { fixed, fixedIssues };
}

/**
 * Extract all page slugs from content directory listing
 */
export function extractPageSlugs(
  files: { name: string; path: string }[],
  citySlug: string
): string[] {
  return files
    .filter((f) => f.name.endsWith(".md"))
    .map((f) => {
      const slug = f.name.replace(".md", "");
      if (slug === "_index") {
        return `/${citySlug}/`;
      }
      return `/${citySlug}/${slug}/`;
    });
}
