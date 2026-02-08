const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(__dirname, '../../india-experiences/src/content/delhi');
const OUTPUT_FILE = path.join(__dirname, '../../india-experiences/data/content-banks/delhi.json');

// Read all markdown files
const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

const pages = [];
const categoriesSet = new Set();

files.forEach((file, index) => {
  const filePath = path.join(CONTENT_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  const slug = file.replace('.md', '');
  const category = frontmatter.category || 'general';
  categoriesSet.add(category);

  // Count words in body
  const wordCount = body.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Determine page type
  let type = 'paa';
  if (slug === '_index' || slug === 'index') {
    type = 'hub';
  } else if (frontmatter.type === 'category' || slug.includes('category')) {
    type = 'category';
  } else if (frontmatter.type) {
    type = frontmatter.type;
  }

  pages.push({
    id: `delhi-${index + 1}`,
    type: type,
    category: category,
    title: frontmatter.title || slug.replace(/-/g, ' '),
    slug: slug,
    contentDirection: frontmatter.description || '',
    status: 'generated', // These files already exist
    wordCount: wordCount,
    generatedAt: frontmatter.dateModified || frontmatter.datePublished || new Date().toISOString(),
    validationErrors: []
  });
});

// Build categories array
const categories = Array.from(categoriesSet).map((cat, i) => ({
  id: `cat-${i + 1}`,
  name: cat.charAt(0).toUpperCase() + cat.slice(1),
  slug: cat,
  hasCategoryPage: pages.some(p => p.type === 'category' && p.category === cat),
  hasHubPage: pages.some(p => p.type === 'hub' && p.category === cat)
}));

const contentBank = {
  city: 'delhi',
  cityName: 'Delhi',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  researchSources: ['Existing content migration'],
  categories: categories,
  pages: pages,
  notes: 'Content bank created from existing markdown files'
};

// Ensure directory exists
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

// Write the content bank
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentBank, null, 2));

console.log(`Created content bank with ${pages.length} pages and ${categories.length} categories`);
console.log(`Output: ${OUTPUT_FILE}`);
