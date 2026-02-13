/**
 * Structural AI Pattern Detection
 *
 * Detects patterns that indicate AI-generated content beyond simple phrase matching:
 * - Rule-of-Three lists
 * - Synonym cycling
 * - Generic openings
 * - Rhetorical Q&A
 * - Parallel sentence structures
 * - Uniform paragraph rhythm
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for synonym groups
let SYNONYM_GROUPS = null;

async function loadSynonymGroups() {
  if (SYNONYM_GROUPS) return SYNONYM_GROUPS;

  try {
    const groupsPath = path.join(__dirname, '..', '..', '..', 'data', 'synonym-groups.json');
    const data = await fs.readFile(groupsPath, 'utf-8');
    const parsed = JSON.parse(data);
    SYNONYM_GROUPS = parsed.groups;
    return SYNONYM_GROUPS;
  } catch (err) {
    console.error('Failed to load synonym-groups.json:', err.message);
    return {};
  }
}

/**
 * Detect Rule-of-Three patterns
 * AI loves three-item comma lists: "X, Y, and Z"
 */
function detectRuleOfThree(content) {
  const violations = [];
  const lines = content.split('\n');

  // Pattern: word, word, and word OR word, word and word
  const threeItemPattern = /(\b\w+\b),\s*(\b\w+\b),?\s*(?:and|or)\s*(\b\w+\b)/gi;

  let lineNum = 0;
  for (const line of lines) {
    lineNum++;
    let match;

    while ((match = threeItemPattern.exec(line)) !== null) {
      const [fullMatch, item1, item2, item3] = match;

      // Calculate suspicion score
      let suspicion = 0;
      const items = [item1, item2, item3];

      // Check for similar length (±2 chars)
      const lengths = items.map(i => i.length);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / 3;
      const similarLength = lengths.every(l => Math.abs(l - avgLen) <= 2);
      if (similarLength) suspicion += 1;

      // Check for alliteration (same starting letter)
      const firstLetters = items.map(i => i[0].toLowerCase());
      if (firstLetters[0] === firstLetters[1] && firstLetters[1] === firstLetters[2]) {
        suspicion += 2;
      }

      // Check for rhyming endings (same last 2+ chars)
      const endings = items.map(i => i.slice(-2).toLowerCase());
      if (endings[0] === endings[1] && endings[1] === endings[2]) {
        suspicion += 2;
      }

      // Only flag high-suspicion rule-of-three (alliterative, same length, etc.)
      if (suspicion >= 2) {
        violations.push({
          type: 'rule-of-three',
          line: lineNum,
          text: fullMatch,
          items,
          suspicion,
          points: suspicion >= 3 ? 4 : 2
        });
      }
    }
  }

  return violations;
}

/**
 * Detect Synonym Cycling
 * AI pads content by saying the same thing multiple ways
 */
async function detectSynonymCycling(content) {
  const groups = await loadSynonymGroups();
  const violations = [];
  const lines = content.split('\n');

  // Build reverse lookup: word -> group name
  const wordToGroup = {};
  for (const [groupName, groupData] of Object.entries(groups)) {
    for (const word of groupData.words) {
      wordToGroup[word.toLowerCase()] = groupName;
    }
  }

  let lineNum = 0;
  for (const line of lines) {
    lineNum++;

    // Get all words in the line
    const words = line.toLowerCase().match(/\b[a-z]+\b/g) || [];

    // Find groups of synonyms within a sliding window
    const windowSize = 7;
    for (let i = 0; i < words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize);
      const groupCounts = {};

      for (const word of window) {
        const group = wordToGroup[word];
        if (group) {
          if (!groupCounts[group]) {
            groupCounts[group] = { count: 0, words: [] };
          }
          groupCounts[group].count++;
          if (!groupCounts[group].words.includes(word)) {
            groupCounts[group].words.push(word);
          }
        }
      }

      // Flag if 2+ different synonyms from same group
      for (const [group, data] of Object.entries(groupCounts)) {
        if (data.words.length >= 2) {
          // Check if we already flagged this exact combination on this line
          const existingViolation = violations.find(
            v => v.line === lineNum && v.group === group
          );
          if (!existingViolation) {
            violations.push({
              type: 'synonym-cycling',
              line: lineNum,
              group,
              words: data.words,
              text: data.words.join(', '),
              points: data.words.length >= 3 ? 8 : 5
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Detect Generic Openings
 * Sentences that could apply to any city
 */
function detectGenericOpenings(content, cityName) {
  const violations = [];
  const lines = content.split('\n');

  // Generic opening templates (with city name placeholder)
  const genericPatterns = [
    /^.{0,50}is a city of contrasts/i,
    /^.{0,50}offers something for everyone/i,
    /^.{0,50}has something for everyone/i,
    /^.{0,50}is a vibrant (city|destination|metropolis)/i,
    /^.{0,50}is known for its/i,
    /^.{0,50}is famous for its/i,
    /^.{0,50}is one of .{0,30}most .{0,20} (cities|destinations)/i,
    /^.{0,50}is a (must-visit|must-see)/i,
    /^.{0,50}is a .{0,20} blend of/i,
    /^.{0,50}welcomes (you|visitors|tourists)/i,
    /^.{0,50}awaits (you|visitors|tourists)/i,
    /^.{0,50}has it all/i,
    /^.{0,50}offers everything/i,
    /^.{0,50}is like nowhere else/i,
    /^.{0,50}there's nowhere quite like/i,
    /^.{0,50}is (truly )?unique/i,
    /^(discover|explore|experience) .{0,30}$/i,
    /^welcome to/i
  ];

  // Check first paragraph and section openings
  let inFirstParagraph = true;
  let lineNum = 0;
  let sectionStart = false;

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();

    // Track section headings
    if (trimmed.startsWith('##')) {
      sectionStart = true;
      continue;
    }

    // Check openings (first paragraph or after section heading)
    if ((inFirstParagraph || sectionStart) && trimmed.length > 20) {
      for (const pattern of genericPatterns) {
        if (pattern.test(trimmed)) {
          violations.push({
            type: 'generic-opening',
            line: lineNum,
            text: trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''),
            points: 10
          });
          break;
        }
      }

      // City-swap test: replace city name and check if still makes sense
      if (cityName && trimmed.toLowerCase().includes(cityName.toLowerCase())) {
        const genericized = trimmed.replace(new RegExp(cityName, 'gi'), '[CITY]');
        // If the sentence is very short and generic after replacement, flag it
        if (genericized.length < 60 && /\[CITY\] (is|has|offers|provides)/.test(genericized)) {
          const alreadyFlagged = violations.find(v => v.line === lineNum);
          if (!alreadyFlagged) {
            violations.push({
              type: 'generic-opening',
              line: lineNum,
              text: trimmed.slice(0, 80),
              note: 'Could apply to any city',
              points: 8
            });
          }
        }
      }

      sectionStart = false;
    }

    // End of first paragraph
    if (inFirstParagraph && trimmed === '') {
      inFirstParagraph = false;
    }
  }

  return violations;
}

/**
 * Detect Rhetorical Q&A
 * AI loves asking questions then immediately answering them
 */
function detectRhetoricalQA(content) {
  const violations = [];
  const lines = content.split('\n');

  // Answer signal phrases
  const answerSignals = [
    'the answer is',
    'the answer lies',
    'the reason is',
    "it's because",
    'simple:',
    'easy:',
    "here's",
    "here is",
    'well,',
    'actually,',
    'you should',
    'the best',
    'the most'
  ];

  // Question patterns that AI overuses
  const aiQuestionPatterns = [
    /^what makes .{0,30} (special|unique|different)/i,
    /^why (should you|visit|go to)/i,
    /^where should you/i,
    /^how do you/i,
    /^when is the best time/i,
    /^what is .{0,30} known for/i,
    /^looking for/i,
    /^want to/i,
    /^ready to/i,
    /^curious about/i
  ];

  let lineNum = 0;
  let previousLine = '';

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();

    // Check if previous line was a question
    if (previousLine.endsWith('?')) {
      const lowerLine = trimmed.toLowerCase();

      // Check for answer signals
      for (const signal of answerSignals) {
        if (lowerLine.startsWith(signal) || lowerLine.includes(signal)) {
          violations.push({
            type: 'rhetorical-qa',
            line: lineNum - 1,
            question: previousLine.slice(0, 60),
            answer: trimmed.slice(0, 60),
            points: 4
          });
          break;
        }
      }
    }

    // Check for AI-favorite question patterns
    for (const pattern of aiQuestionPatterns) {
      if (pattern.test(trimmed) && trimmed.endsWith('?')) {
        // Only flag if not in FAQ section
        const inFAQ = lines.slice(Math.max(0, lineNum - 10), lineNum)
          .some(l => l.toLowerCase().includes('faq') || l.toLowerCase().includes('frequently asked'));

        if (!inFAQ) {
          const alreadyFlagged = violations.find(v => v.line === lineNum);
          if (!alreadyFlagged) {
            violations.push({
              type: 'rhetorical-qa',
              line: lineNum,
              question: trimmed.slice(0, 60),
              note: 'AI-style rhetorical question',
              points: 3
            });
          }
        }
        break;
      }
    }

    previousLine = trimmed;
  }

  return violations;
}

/**
 * Detect Parallel Sentence Structure
 * AI repeats the same sentence patterns
 */
function detectParallelStructure(content) {
  const violations = [];
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  // Extract sentence structure templates
  function getStructureTemplate(sentence) {
    const trimmed = sentence.trim();

    // Common AI patterns
    const patterns = [
      { regex: /^The \w+ is \w+\.?$/i, template: 'The [NOUN] is [ADJ].' },
      { regex: /^You'll \w+ the \w+/i, template: "You'll [VERB] the [NOUN]." },
      { regex: /^\w+ offers \w+/i, template: '[CITY] offers [NOUN].' },
      { regex: /^\w+ is known for/i, template: '[CITY] is known for.' },
      { regex: /^\w+ is a \w+ \w+/i, template: '[NOUN] is a [ADJ] [NOUN].' },
      { regex: /^From \w+ to \w+/i, template: 'From [X] to [Y].' },
      { regex: /^Experience the \w+/i, template: 'Experience the [NOUN].' },
      { regex: /^Discover the \w+/i, template: 'Discover the [NOUN].' },
      { regex: /^Explore the \w+/i, template: 'Explore the [NOUN].' }
    ];

    for (const { regex, template } of patterns) {
      if (regex.test(trimmed)) {
        return template;
      }
    }

    return null;
  }

  // Look for consecutive sentences with same structure
  let consecutiveCount = 0;
  let currentTemplate = null;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const template = getStructureTemplate(lines[i]);

    if (template && template === currentTemplate) {
      consecutiveCount++;
    } else {
      // Check if we had a violation
      if (consecutiveCount >= 3) {
        violations.push({
          type: 'parallel-structure',
          line: startLine + 1,
          template: currentTemplate,
          count: consecutiveCount,
          points: consecutiveCount >= 4 ? 7 : 4
        });
      }
      currentTemplate = template;
      consecutiveCount = template ? 1 : 0;
      startLine = i;
    }
  }

  // Check final group
  if (consecutiveCount >= 3) {
    violations.push({
      type: 'parallel-structure',
      line: startLine + 1,
      template: currentTemplate,
      count: consecutiveCount,
      points: consecutiveCount >= 4 ? 7 : 4
    });
  }

  return violations;
}

/**
 * Detect Uniform Paragraph Rhythm
 * AI produces paragraphs with suspiciously consistent sentence lengths
 */
function detectUniformRhythm(content) {
  const violations = [];
  const paragraphs = content.split(/\n\s*\n/);

  let paragraphNum = 0;
  for (const paragraph of paragraphs) {
    paragraphNum++;
    const trimmed = paragraph.trim();

    // Skip short paragraphs, headers, and lists
    if (trimmed.length < 100 || trimmed.startsWith('#') || trimmed.startsWith('-')) {
      continue;
    }

    // Split into sentences
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length < 4) continue;

    // Calculate word counts
    const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);

    // Calculate standard deviation
    const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    const squaredDiffs = wordCounts.map(c => Math.pow(c - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Flag if standard deviation is very low (suspiciously uniform)
    // Only flag if 5+ sentences with very consistent length
    if (stdDev < 2 && sentences.length >= 5) {
      violations.push({
        type: 'uniform-rhythm',
        paragraph: paragraphNum,
        sentenceCount: sentences.length,
        avgWordCount: Math.round(avg),
        stdDev: Math.round(stdDev * 10) / 10,
        points: 2
      });
    }
  }

  return violations;
}

/**
 * Detect Formatting Patterns
 * Em dash overuse, excessive bold, inline headers
 */
function detectFormattingPatterns(content) {
  const violations = [];
  const lines = content.split('\n');

  let totalEmDashes = 0;
  let totalBoldPhrases = 0;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();

    // Count em dashes in line
    const emDashCount = (trimmed.match(/—/g) || []).length;
    totalEmDashes += emDashCount;

    if (emDashCount > 2) {
      violations.push({
        type: 'em-dash-overuse',
        line: lineNum,
        count: emDashCount,
        text: trimmed.slice(0, 60),
        points: 2
      });
    }

    // Check for AI-style inline headers (only flag chatbot-style patterns)
    // Legitimate: **Duration:** 3 hours, **Price:** ₹500, **Best Time:** Morning
    // AI tells: **Pro Tip:**, **Note:**, **Remember:**, **Important:**
    const aiInlineHeaders = [
      /^\*\*Pro Tip:\*\*/i,
      /^\*\*Quick Tip:\*\*/i,
      /^\*\*Tip:\*\*/i,
      /^\*\*Note:\*\*/i,
      /^\*\*Remember:\*\*/i,
      /^\*\*Important:\*\*/i,
      /^\*\*Warning:\*\*/i,
      /^\*\*Fun Fact:\*\*/i,
      /^\*\*Did You Know:\*\*/i,
      /^\*\*Insider Tip:\*\*/i,
      /^\*\*Key Point:\*\*/i,
      /^\*\*Key Takeaway:\*\*/i,
      /^\*\*Bottom Line:\*\*/i,
      /^\*\*The Verdict:\*\*/i
    ];
    for (const pattern of aiInlineHeaders) {
      if (pattern.test(trimmed)) {
        violations.push({
          type: 'inline-header',
          line: lineNum,
          text: trimmed.slice(0, 40),
          points: 4
        });
        break;
      }
    }

    // Count bold phrases (not headers)
    if (!trimmed.startsWith('#')) {
      const boldCount = (trimmed.match(/\*\*[^*]+\*\*/g) || []).length;
      totalBoldPhrases += boldCount;

      if (boldCount > 3) {
        violations.push({
          type: 'excessive-bold',
          line: lineNum,
          count: boldCount,
          points: 3
        });
      }
    }
  }

  // Page-level em dash check (only flag severe overuse)
  if (totalEmDashes > 20) {
    violations.push({
      type: 'em-dash-overuse-page',
      count: totalEmDashes,
      note: 'Page-wide em dash overuse',
      points: 3
    });
  }

  return violations;
}

/**
 * Main structural detection function
 */
export async function detectStructuralPatterns(content, options = {}) {
  const { cityName, fileName } = options;

  const results = {
    ruleOfThree: detectRuleOfThree(content),
    synonymCycling: await detectSynonymCycling(content),
    genericOpenings: detectGenericOpenings(content, cityName),
    rhetoricalQA: detectRhetoricalQA(content),
    parallelStructure: detectParallelStructure(content),
    uniformRhythm: detectUniformRhythm(content),
    formatting: detectFormattingPatterns(content)
  };

  // Calculate total score
  let totalPoints = 0;
  const allViolations = [];

  for (const [category, violations] of Object.entries(results)) {
    for (const v of violations) {
      totalPoints += v.points || 0;
      allViolations.push({ ...v, category });
    }
  }

  // Apply caps per category
  const categoryCaps = {
    ruleOfThree: 18,
    synonymCycling: 25,
    genericOpenings: 30,
    rhetoricalQA: 16,
    parallelStructure: 20,
    uniformRhythm: 15,
    formatting: 20
  };

  let cappedTotal = 0;
  for (const [category, violations] of Object.entries(results)) {
    const categoryPoints = violations.reduce((sum, v) => sum + (v.points || 0), 0);
    cappedTotal += Math.min(categoryPoints, categoryCaps[category] || categoryPoints);
  }

  return {
    violations: allViolations,
    byCategory: results,
    score: {
      raw: totalPoints,
      capped: cappedTotal,
      violationCount: allViolations.length
    }
  };
}

/**
 * Format violations for error reporting
 */
export function formatStructuralErrors(structuralResults, fileName) {
  const errors = [];

  for (const violation of structuralResults.violations) {
    let message = '';

    switch (violation.type) {
      case 'rule-of-three':
        message = `Rule-of-three: "${violation.text}" (suspicion: ${violation.suspicion})`;
        break;
      case 'synonym-cycling':
        message = `Synonym cycling [${violation.group}]: ${violation.words.join(', ')}`;
        break;
      case 'generic-opening':
        message = `Generic opening: "${violation.text}"`;
        break;
      case 'rhetorical-qa':
        message = `Rhetorical Q&A: "${violation.question}"`;
        break;
      case 'parallel-structure':
        message = `Parallel structure: ${violation.count}x "${violation.template}"`;
        break;
      case 'uniform-rhythm':
        message = `Uniform paragraph rhythm: ${violation.sentenceCount} sentences, SD=${violation.stdDev}`;
        break;
      case 'em-dash-overuse':
        message = `Em dash overuse: ${violation.count} in one line`;
        break;
      case 'inline-header':
        message = `Inline header pattern: "${violation.text}"`;
        break;
      case 'excessive-bold':
        message = `Excessive bold: ${violation.count} phrases in one line`;
        break;
      default:
        message = `${violation.type}: ${JSON.stringify(violation)}`;
    }

    errors.push({
      file: fileName,
      type: 'structural-' + violation.type,
      category: violation.category,
      line: violation.line || violation.paragraph,
      points: violation.points,
      message
    });
  }

  return errors;
}

export { loadSynonymGroups };
