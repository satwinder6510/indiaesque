import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path constants
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ASTRO_DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');
const ADMIN_DATA_DIR = path.join(PROJECT_ROOT, 'data');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src', 'content');

// Ensure directories exist
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Read cities from src/data/cities.json
export async function getCities() {
  try {
    const data = await fs.readFile(path.join(ASTRO_DATA_DIR, 'cities.json'), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading cities.json:', err.message);
    return [];
  }
}

// Read categories from src/data/categories.json
export async function getCategories() {
  try {
    const data = await fs.readFile(path.join(ASTRO_DATA_DIR, 'categories.json'), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading categories.json:', err.message);
    return [];
  }
}

// Read content bank from data/content-banks/{city}.json
export async function getContentBank(city) {
  try {
    const filePath = path.join(ADMIN_DATA_DIR, 'content-banks', `${city}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Save content bank to data/content-banks/{city}.json
export async function saveContentBank(city, data) {
  await ensureDir(path.join(ADMIN_DATA_DIR, 'content-banks'));
  const filePath = path.join(ADMIN_DATA_DIR, 'content-banks', `${city}.json`);
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Read admin state from data/admin-state.json
export async function getAdminState() {
  try {
    const filePath = path.join(ADMIN_DATA_DIR, 'admin-state.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { cities: {}, lastUpdated: null };
    }
    throw err;
  }
}

// Save admin state to data/admin-state.json
export async function saveAdminState(data) {
  await ensureDir(ADMIN_DATA_DIR);
  const filePath = path.join(ADMIN_DATA_DIR, 'admin-state.json');
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Read hub.json for a city
export async function getHubData(city) {
  try {
    const filePath = path.join(ASTRO_DATA_DIR, 'content', city, 'hub.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Update hub.json generatedContent for a city
export async function updateHubContent(city, generatedContent) {
  const filePath = path.join(ASTRO_DATA_DIR, 'content', city, 'hub.json');

  // Read existing hub.json
  let hubData;
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    hubData = JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Create new hub.json if doesn't exist
      hubData = {
        slug: city,
        name: city.charAt(0).toUpperCase() + city.slice(1),
        title: `${city.charAt(0).toUpperCase() + city.slice(1)} Travel Guide`,
        description: '',
        sections: [],
        viator: { destinationId: null, enabled: false },
        createdAt: new Date().toISOString()
      };
    } else {
      throw err;
    }
  }

  // Update content and timestamp
  hubData.generatedContent = generatedContent;
  hubData.updatedAt = new Date().toISOString();

  // Ensure directory exists
  await ensureDir(path.dirname(filePath));

  // Write back
  await fs.writeFile(filePath, JSON.stringify(hubData, null, 2), 'utf-8');
  return hubData;
}

// List content files for a city
export async function getContentFiles(city) {
  try {
    const cityDir = path.join(CONTENT_DIR, city);
    const files = await glob('*.md', { cwd: cityDir });
    return files.map(f => f.replace('.md', ''));
  } catch (err) {
    return [];
  }
}

// Read a content file (parse frontmatter + content)
export async function readContentFile(city, slug) {
  try {
    const filePath = path.join(CONTENT_DIR, city, `${slug}.md`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);
    const stats = await fs.stat(filePath);
    return {
      frontmatter,
      content,
      modifiedAt: stats.mtime.toISOString()
    };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Write a content file (frontmatter + content)
export async function writeContentFile(city, slug, frontmatter, content) {
  await ensureDir(path.join(CONTENT_DIR, city));
  const filePath = path.join(CONTENT_DIR, city, `${slug}.md`);
  const output = matter.stringify(content, frontmatter);
  await fs.writeFile(filePath, output, 'utf-8');
}

// Delete a content file
export async function deleteContentFile(city, slug) {
  const filePath = path.join(CONTENT_DIR, city, `${slug}.md`);
  await fs.unlink(filePath);
}

// Get all content banks
export async function getAllContentBanks() {
  try {
    const dir = path.join(ADMIN_DATA_DIR, 'content-banks');
    const files = await glob('*.json', { cwd: dir });
    const banks = {};
    for (const file of files) {
      const city = file.replace('.json', '');
      banks[city] = await getContentBank(city);
    }
    return banks;
  } catch (err) {
    return {};
  }
}
