import { readFile } from 'fs/promises';

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
  return data;
}

const files = [
  'src/content/delhi/best-biryani-in-delhi.md',
  'src/content/mumbai/best-bars-mumbai.md',
  'src/content/jaipur/amber-fort-jaipur-guide.md',
  'src/content/kolkata/belur-math-kolkata.md',
];

for (const f of files) {
  const content = await readFile(f, 'utf-8');
  const data = parseFrontmatter(content);
  console.log(f, '-> tier:', data.tier, ', city:', data.city, ', category:', data.category);
}
