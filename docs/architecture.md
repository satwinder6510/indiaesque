# Indiaesque — Technical Architecture

**Reference document. Consult before making any structural changes.**

Last updated: 2026-02-08

---

## Table of Contents

1. Architecture Overview
2. Static Site Generator
3. URL Structure
4. Page Templates & HTML Structure
5. Schema Markup (JSON-LD)
6. Internal Linking Architecture
7. Sitemap Strategy
8. AI Crawler Optimization
9. SEO Meta Tags
10. Performance Requirements
11. Hosting & Deployment
12. Analytics & Search Console
13. Content Injection Workflow
14. File & Folder Structure

---

## 1. Architecture Overview

**Principle: Everything in the HTML. No client-side rendering. Every page is a complete, self-contained HTML document.**

```
┌──────────────────────────────────────────────┐
│              STATIC SITE                      │
│                                               │
│  Markdown/JSON ──→ Build Step ──→ HTML files  │
│  (content)        (SSG)          (deployed)   │
│                                               │
│  Every page = complete HTML                   │
│  No JavaScript required to read content       │
│  Google/AI crawlers see everything instantly   │
└──────────────────────────────────────────────┘
```

**Why static:**
- Fastest possible page load (just serving files, no server computation)
- Near-perfect PageSpeed scores (90+)
- Free/cheap hosting (Netlify, Vercel, Cloudflare Pages)
- No server to maintain, no database, no security patches
- Scales infinitely (3,000 pages same as 30 pages)
- Google crawls and indexes faster
- AI crawlers read full content immediately

**What this means practically:**
- Content lives as Markdown or JSON files
- Build step converts them to HTML using templates
- HTML files are deployed to CDN
- No WordPress, no CMS, no server-side rendering at request time
- Content updates = rebuild + redeploy (automated, takes seconds)

---

## 2. Static Site Generator

**Recommended: Astro**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Astro** | Zero JS by default, fast builds, component islands for interactive bits, good ecosystem | Newer than Hugo | **Best fit** |
| Hugo | Fastest builds, mature, great for content sites | Go templates are ugly, less flexible | Good alternative |
| Next.js (static export) | React ecosystem, huge community | Overkill, ships JS by default, harder to keep zero-JS | Avoid |
| 11ty (Eleventy) | Simple, flexible, JS-based | Smaller community, fewer starters | Decent alternative |

**Why Astro specifically:**
- Outputs pure HTML by default — zero JavaScript shipped unless you explicitly add it
- Content Collections feature is built for exactly this use case (thousands of markdown files with frontmatter)
- Can add interactive islands later (search, filters, maps) without breaking the static HTML foundation
- Built-in sitemap generation
- Built-in RSS feed
- Image optimization built in
- TypeScript support for content schemas (catches errors in 3,000 files)

**Install:**
```bash
npm create astro@latest indiaesque
```

---

## 3. URL Structure

**Clean, keyword-rich, hierarchical. No trailing slashes. No parameters.**

```
https://domain.com/                                    ← Homepage
https://domain.com/delhi/                              ← City hub
https://domain.com/delhi/food-tours/                   ← Category page
https://domain.com/delhi/cooking-classes/              ← Category page
https://domain.com/delhi/heritage-walks/               ← Category page
https://domain.com/delhi/markets-shopping/             ← Category page
https://domain.com/delhi/day-trips/                    ← Category page
https://domain.com/delhi/is-delhi-safe-for-tourists/   ← PAA page
https://domain.com/delhi/best-street-food-old-delhi/   ← PAA page
https://domain.com/delhi/how-many-days-in-delhi/       ← PAA page

https://domain.com/jaipur/                             ← City hub
https://domain.com/jaipur/food-tours/                  ← Category page
https://domain.com/jaipur/block-printing-workshops/    ← Category page

https://domain.com/food-tours-india/                   ← Cross-city category hub
https://domain.com/cooking-classes-india/              ← Cross-city category hub

https://domain.com/blog/                               ← Editorial blog index
https://domain.com/blog/i-was-born-in-india/           ← Blog post (human-written)
```

**URL Rules:**
- All lowercase
- Hyphens between words (never underscores)
- No dates in URLs (content is evergreen, updated annually)
- No /index.html — clean paths only
- City slug is always the first path segment for city content
- Max 3 levels deep: /city/page/ or /city/category/
- PAA pages sit directly under city: /delhi/is-delhi-safe/ (not /delhi/faq/is-delhi-safe/)

**Canonical URLs:**
Every page must have a canonical tag pointing to itself. This prevents duplicate content issues.

```html
<link rel="canonical" href="https://domain.com/delhi/food-tours/" />
```

---

## 4. Page Templates & HTML Structure

### 4.1 Base HTML Template (every page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta (see Section 9) -->
    <title>{title} — {site_name}</title>
    <meta name="description" content="{meta_description}">
    <link rel="canonical" href="{canonical_url}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{meta_description}">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:type" content="article">
    <meta property="og:image" content="{og_image}">
    <meta property="og:site_name" content="{site_name}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{meta_description}">
    
    <!-- Schema Markup (see Section 5) -->
    <script type="application/ld+json">
    {schema_json}
    </script>
    
    <!-- Preload critical CSS -->
    <link rel="stylesheet" href="/styles/main.css">
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
    <header>
        <nav aria-label="Main navigation">
            <!-- Logo + city navigation -->
            <!-- Keep minimal. No mega-menus that require JS -->
        </nav>
    </header>
    
    <main>
        <!-- Breadcrumbs (see below) -->
        <!-- Page content -->
    </main>
    
    <footer>
        <!-- City links, category links, about, contact -->
        <!-- This is a major internal linking opportunity -->
    </footer>
    
    <!-- NO JavaScript required for content -->
    <!-- JS only for: search, analytics, optional interactivity -->
</body>
</html>
```

### 4.2 Breadcrumbs (every page except homepage)

Always in HTML, always visible, always with schema markup.

```html
<nav aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="/"><span itemprop="name">Home</span></a>
            <meta itemprop="position" content="1">
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="/delhi/"><span itemprop="name">Delhi</span></a>
            <meta itemprop="position" content="2">
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name">Food Tours</span>
            <meta itemprop="position" content="3">
        </li>
    </ol>
</nav>
```

### 4.3 City Hub Page Template

```html
<main>
    <article>
        <h1>Things To Do In Delhi — 2026 Guide</h1>
        
        <p class="intro">
            <!-- 2-3 sentence intro. Include primary keyword naturally. -->
            <!-- This text should be unique and compelling — it may appear in search snippets -->
        </p>
        
        <nav class="toc" aria-label="On this page">
            <!-- Jump links to each section -->
            <ul>
                <li><a href="#food">Food & Drink</a></li>
                <li><a href="#heritage">Heritage & History</a></li>
                <!-- ... -->
            </ul>
        </nav>
        
        <section id="food">
            <h2>Food & Drink Experiences</h2>
            <p><!-- Summary paragraph --></p>
            <p><a href="/delhi/food-tours/">Full guide to Delhi food tours →</a></p>
        </section>
        
        <section id="heritage">
            <h2>Heritage & History</h2>
            <p><!-- Summary paragraph --></p>
            <p><a href="/delhi/heritage-walks/">Full guide to Delhi heritage walks →</a></p>
        </section>
        
        <!-- Repeat for each category -->
        
        <section id="practical">
            <h2>Practical Information</h2>
            <p><!-- Best time, getting there, getting around, where to stay --></p>
        </section>
        
        <section id="faq">
            <h2>Frequently Asked Questions</h2>
            <!-- Top 5-8 PAA questions answered directly -->
            <!-- CRITICAL: Full answer text in HTML, not hidden behind accordion JS -->
            <div class="faq-item">
                <h3>Is 2 days enough for Delhi?</h3>
                <p><!-- Direct answer, 100-200 words --></p>
            </div>
            <div class="faq-item">
                <h3>Is Delhi safe for tourists?</h3>
                <p><!-- Direct answer --></p>
            </div>
        </section>
    </article>
    
    <!-- Related pages -->
    <aside>
        <h2>More Delhi Guides</h2>
        <ul>
            <li><a href="/delhi/best-street-food-old-delhi/">Best Street Food in Old Delhi</a></li>
            <li><a href="/delhi/how-many-days-in-delhi/">How Many Days Do You Need in Delhi?</a></li>
            <!-- 5-10 related PAA pages -->
        </ul>
    </aside>
</main>
```

### 4.4 Category Page Template

```html
<main>
    <article>
        <h1>Best Food Tours In Delhi — 2026 Guide</h1>
        
        <p class="intro"><!-- Compelling intro with keyword --></p>
        
        <section>
            <h2>What To Expect On A Delhi Food Tour</h2>
            <p><!-- Duration, price range, format, best time of day --></p>
        </section>
        
        <section>
            <h2>The Best Delhi Food Tours</h2>
            
            <!-- OPERATOR LISTINGS — this is where monetisation happens -->
            <div class="listing" id="operator-1">
                <h3>{Operator Name}</h3>
                <p class="listing-meta">
                    <span>Duration: 3 hours</span>
                    <span>Price: ₹2,500 ($30)</span>
                    <span>Group size: Max 8</span>
                </p>
                <p><!-- Description, what makes it good, who it's for --></p>
            </div>
            
            <div class="listing" id="operator-2">
                <h3>{Operator Name}</h3>
                <!-- Same structure -->
            </div>
        </section>
        
        <section>
            <h2>How To Book</h2>
            <p><!-- Booking info, advance notice needed --></p>
        </section>
        
        <section>
            <h2>Tips For Your Food Tour</h2>
            <p><!-- What to wear, dietary needs, arrive hungry --></p>
        </section>
        
        <section id="faq">
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <h3>How much does a food tour cost in Delhi?</h3>
                <p><!-- Answer --></p>
            </div>
            <div class="faq-item">
                <h3>Is street food safe in Delhi?</h3>
                <p><!-- Answer --></p>
            </div>
        </section>
    </article>
    
    <aside>
        <h2>More Delhi Experiences</h2>
        <ul>
            <li><a href="/delhi/cooking-classes/">Cooking Classes in Delhi</a></li>
            <li><a href="/delhi/heritage-walks/">Heritage Walks in Delhi</a></li>
        </ul>
    </aside>
</main>
```

### 4.5 PAA Answer Page Template

```html
<main>
    <article>
        <h1>Is Delhi Safe For Tourists?</h1>
        
        <!-- CRITICAL: Direct answer in first 50 words -->
        <!-- This targets Google's featured snippet / position zero -->
        <p class="direct-answer">
            <strong>Delhi is generally safe for tourists.</strong> Violent crime against visitors
            is rare. The main risks are petty theft, scams near tourist sites, and aggressive
            touts. Use the metro, book Uber/Ola instead of street taxis, and avoid isolated
            areas after dark.
        </p>
        
        <section>
            <h2>Safety By Area</h2>
            <p><!-- Detailed breakdown by neighbourhood --></p>
        </section>
        
        <section>
            <h2>Common Scams To Watch For</h2>
            <p><!-- Specific scams with how to avoid --></p>
        </section>
        
        <section>
            <h2>Safety Tips For Women</h2>
            <p><!-- Specific advice --></p>
        </section>
        
        <section>
            <h2>Getting Around Safely</h2>
            <p><!-- Transport safety --></p>
        </section>
        
        <!-- Related questions answered briefly -->
        <section id="faq">
            <h2>Related Questions</h2>
            <div class="faq-item">
                <h3>Is Delhi safe at night?</h3>
                <p><!-- Brief answer + link to dedicated page if exists --></p>
            </div>
            <div class="faq-item">
                <h3>Is Delhi safe for solo female travellers?</h3>
                <p><!-- Brief answer + link --></p>
            </div>
        </section>
        
        <!-- Contextual navigation -->
        <nav class="next-steps">
            <h2>Plan Your Delhi Trip</h2>
            <ul>
                <li><a href="/delhi/">Complete Delhi Guide</a></li>
                <li><a href="/delhi/how-many-days-in-delhi/">How Many Days Do You Need?</a></li>
                <li><a href="/delhi/food-tours/">Best Food Tours in Delhi</a></li>
            </ul>
        </nav>
    </article>
</main>
```

---

## 5. Schema Markup (JSON-LD)

**All schema goes in `<head>` as JSON-LD. Not microdata, not RDFa. JSON-LD is what Google recommends and is cleanest to maintain at scale.**

### 5.1 FAQPage Schema (every page with FAQ section)

```json
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Is Delhi safe for tourists?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Delhi is generally safe for tourists. Violent crime against visitors is rare. The main risks are petty theft, scams near tourist sites, and aggressive touts. Use the metro, book Uber/Ola instead of street taxis, and avoid isolated areas after dark."
            }
        },
        {
            "@type": "Question",
            "name": "Is Delhi safe at night?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Parts of Delhi are safe at night. South Delhi neighbourhoods like Greater Kailash, Defence Colony, and the area around Khan Market are well-lit and busy. Connaught Place is fine until late. Avoid Old Delhi lanes, Paharganj, and any unfamiliar area after dark. Always use Uber or Ola rather than street taxis at night."
            }
        }
    ]
}
```

### 5.2 TouristDestination Schema (city hub pages)

```json
{
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": "Delhi",
    "description": "India's capital city, home to Mughal architecture, world-class street food, and 174 protected heritage monuments.",
    "touristType": ["Cultural tourism", "Food tourism", "Heritage tourism"],
    "geo": {
        "@type": "GeoCoordinates",
        "latitude": "28.6139",
        "longitude": "77.2090"
    },
    "containedInPlace": {
        "@type": "Country",
        "name": "India"
    }
}
```

### 5.3 Article Schema (every content page)

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Best Food Tours In Delhi — 2026 Guide",
    "description": "Compare the best Delhi food tours including Old Delhi street food walks, cooking classes, and market tours. Prices from ₹1,500.",
    "author": {
        "@type": "Organization",
        "name": "{site_name}",
        "url": "https://domain.com"
    },
    "publisher": {
        "@type": "Organization",
        "name": "{site_name}",
        "logo": {
            "@type": "ImageObject",
            "url": "https://domain.com/logo.png"
        }
    },
    "datePublished": "2026-02-07",
    "dateModified": "2026-02-07",
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://domain.com/delhi/food-tours/"
    }
}
```

### 5.4 BreadcrumbList Schema (every page)

```json
{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://domain.com/"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": "Delhi",
            "item": "https://domain.com/delhi/"
        },
        {
            "@type": "ListItem",
            "position": 3,
            "name": "Food Tours",
            "item": "https://domain.com/delhi/food-tours/"
        }
    ]
}
```

### 5.5 Schema Rules

- **Combine multiple schemas on one page** by wrapping in an array:
```json
[
    { "@context": "https://schema.org", "@type": "Article", ... },
    { "@context": "https://schema.org", "@type": "FAQPage", ... },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", ... }
]
```
- **FAQ answer text must match visible page content** — Google will penalise mismatches
- **dateModified must update** when content is refreshed
- **Validate all schema** with Google's Rich Results Test: https://search.google.com/test/rich-results
- **Never use schema for content not visible on the page** — this is cloaking and will get penalised

---

## 6. Internal Linking Architecture

**Internal links are the single most important technical SEO factor for a content-heavy site. They distribute page authority and tell Google which pages matter most.**

### Link Hierarchy

```
Homepage
  ├── links to all City Hubs (30-40 links)
  ├── links to Cross-City Category Hubs
  │
  City Hub (e.g. /delhi/)
  ├── links DOWN to all Category Pages for that city
  ├── links DOWN to top 10-15 PAA pages for that city
  ├── links ACROSS to other City Hubs
  │
  Category Page (e.g. /delhi/food-tours/)
  ├── links UP to City Hub
  ├── links ACROSS to other Category Pages in same city
  ├── links DOWN to related PAA pages
  ├── links ACROSS to same category in other cities (/jaipur/food-tours/)
  │
  PAA Page (e.g. /delhi/is-delhi-safe/)
  ├── links UP to City Hub
  ├── links UP to relevant Category Page
  ├── links ACROSS to related PAA pages in same city
  └── links to relevant PAA pages in other cities (if applicable)
```

### Link Rules

1. **Every page has minimum 3 internal links** (up, across, and contextual)
2. **City hub pages are the most linked-to pages** — they accumulate the most authority
3. **Use descriptive anchor text** — "best food tours in Delhi" not "click here"
4. **Footer links to all city hubs** — sitewide authority distribution
5. **Sidebar/aside links to related pages** — contextual relevance
6. **No orphan pages** — every page must be reachable within 3 clicks from homepage
7. **Link to new pages from existing ones** — don't just publish, connect

### Auto-Generated Link Blocks

Build these into templates so they're automatic:

**Bottom of every PAA page:**
```html
<nav class="related">
    <h2>More About Delhi</h2>
    <a href="/delhi/">Complete Delhi Guide</a>
    <a href="/delhi/food-tours/">Delhi Food Tours</a>
    <a href="/delhi/{related-paa-1}/">{Related Question 1}</a>
    <a href="/delhi/{related-paa-2}/">{Related Question 2}</a>
</nav>
```

**Bottom of every category page:**
```html
<nav class="related">
    <h2>More Delhi Experiences</h2>
    <!-- Other categories in same city -->
    <a href="/delhi/heritage-walks/">Heritage Walks</a>
    <a href="/delhi/cooking-classes/">Cooking Classes</a>
    
    <h2>Food Tours In Other Cities</h2>
    <!-- Same category in other cities -->
    <a href="/jaipur/food-tours/">Jaipur Food Tours</a>
    <a href="/mumbai/food-tours/">Mumbai Food Tours</a>
</nav>
```

**Footer (sitewide):**
```html
<footer>
    <nav aria-label="Cities">
        <h3>Popular Cities</h3>
        <a href="/delhi/">Delhi</a>
        <a href="/jaipur/">Jaipur</a>
        <a href="/goa/">Goa</a>
        <a href="/mumbai/">Mumbai</a>
        <!-- All tier 1 + tier 2 cities -->
    </nav>
    <nav aria-label="Experiences">
        <h3>Experiences Across India</h3>
        <a href="/food-tours-india/">Food Tours</a>
        <a href="/cooking-classes-india/">Cooking Classes</a>
        <a href="/heritage-walks-india/">Heritage Walks</a>
    </nav>
</footer>
```

---

## 7. Sitemap Strategy

### XML Sitemap

Auto-generated by Astro. Split by section for 3,000+ pages.

```
/sitemap-index.xml          ← Master sitemap index
  /sitemap-cities.xml       ← All city hub pages
  /sitemap-delhi.xml        ← All Delhi pages (hub + category + PAA)
  /sitemap-jaipur.xml       ← All Jaipur pages
  /sitemap-mumbai.xml       ← All Mumbai pages
  ...                       ← One per city
  /sitemap-categories.xml   ← Cross-city category hubs
  /sitemap-blog.xml         ← Blog posts
```

**Why split:** Google processes sitemaps with <50,000 URLs each. Splitting by city makes it easy to monitor indexing per city in Search Console.

### Sitemap Rules

- Include `<lastmod>` date on every URL (update when content changes)
- Include `<changefreq>` — "monthly" for most pages, "weekly" for hub pages
- Include `<priority>` — 1.0 for homepage, 0.9 for city hubs, 0.8 for category pages, 0.7 for PAA pages
- Submit sitemap to Google Search Console immediately after deploy
- Re-submit after adding new city batches

### HTML Sitemap

Also create a human-readable sitemap page at `/sitemap/` listing all cities and categories. This serves as a massive internal linking page and helps crawlers discover deep pages.

---

## 8. AI Crawler Optimization

**AI search (Perplexity, ChatGPT search, Google AI Overviews) is a growing traffic source. Optimize for it explicitly.**

### 8.1 robots.txt

```
User-agent: *
Allow: /

# Explicitly allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

# Block crawlers that add no value
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

Sitemap: https://domain.com/sitemap-index.xml
```

### 8.2 llms.txt

**New standard for helping AI systems understand your site.** Place at root: `https://domain.com/llms.txt`

```markdown
# {Site Name}

> India's most comprehensive guide to experiences, food tours, heritage walks, and things to do across India.

## About

This site covers experiences and activities across 30+ Indian cities. Every page provides practical information including prices in INR, durations, specific locations, and honest recommendations.

## Content Structure

- /[city]/ — Comprehensive city guide
- /[city]/food-tours/ — Food tour guide for that city
- /[city]/heritage-walks/ — Heritage walk guide
- /[city]/cooking-classes/ — Cooking class guide
- /[city]/[topic]/ — Specific guides and FAQs

## Top Cities

- /delhi/ — Delhi experiences guide
- /jaipur/ — Jaipur experiences guide  
- /goa/ — Goa experiences guide
- /mumbai/ — Mumbai experiences guide
- /varanasi/ — Varanasi experiences guide

## Categories

- /food-tours-india/ — Food tours across India
- /cooking-classes-india/ — Cooking classes across India
- /heritage-walks-india/ — Heritage walks across India
```

### 8.3 llms-full.txt

Extended version at `https://domain.com/llms-full.txt` — can contain the full sitemap with page descriptions. AI systems may use this to understand the entire site.

### 8.4 Content Structure For AI Readability

AI systems extract information best from:

1. **Direct answers at the top** — First sentence should answer the page's core question
2. **Clear heading hierarchy** — h1 → h2 → h3, no skipping levels
3. **Specific data in plain text** — "₹2,500 ($30) per person for 3 hours" not just "affordable"
4. **Lists and structured data in HTML** — Not hidden in images or PDFs
5. **No content gating** — No popups, no "sign up to read more", no interstitials

---

## 9. SEO Meta Tags

### Title Tag Formula

```
{Page Topic} — {Site Name}
```

**Rules:**
- Under 60 characters (Google truncates at ~60)
- Primary keyword at the start
- Brand name at the end
- Include year for time-sensitive content

**Examples:**
```
Things To Do In Delhi — 2026 Guide | {Site Name}
Best Food Tours In Delhi — 2026 | {Site Name}
Is Delhi Safe For Tourists? | {Site Name}
How Many Days Do You Need In Delhi? | {Site Name}
```

### Meta Description Formula

```
{Direct answer to query}. {Supporting detail}. {Practical info: prices, duration}.
```

**Rules:**
- 120-155 characters (Google truncates at ~155)
- Include primary keyword naturally
- Include a specific number or data point (prices, duration, quantities)
- Write as a compelling snippet — this is your ad copy in search results

**Examples:**
```
Delhi is generally safe for tourists. Main risks are petty scams, not violent crime. Tips for staying safe on the metro, in markets, and at night.

Compare Delhi's best food tours from ₹1,500. Old Delhi street food walks, cooking classes, and market tours with honest reviews and booking info.

2 days covers Delhi's highlights. 3-4 days lets you go deeper. Day-by-day itineraries for every timeframe with metro routes and entry fees.
```

### Meta Tag Template

```html
<title>{title} | {site_name}</title>
<meta name="description" content="{meta_description}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{full_url}">
```

---

## 10. Performance Requirements

**Target: PageSpeed Insights score 90+ on mobile.**

### Requirements Checklist

- [ ] **Total page weight under 500KB** (HTML + CSS + images above fold)
- [ ] **First Contentful Paint under 1.5s**
- [ ] **Largest Contentful Paint under 2.5s**
- [ ] **Cumulative Layout Shift under 0.1**
- [ ] **Zero render-blocking JavaScript**
- [ ] **CSS inlined or preloaded** (single stylesheet, minified)
- [ ] **Images in WebP format** with width/height attributes (prevents layout shift)
- [ ] **Lazy loading on below-fold images** (`loading="lazy"`)
- [ ] **Web fonts preloaded** (two fonts: DM Serif Display for headings, Source Sans 3 for body)
- [ ] **Gzip/Brotli compression enabled** (CDN handles this)
- [ ] **Cache headers set** (static assets: 1 year, HTML: 1 hour)

### Typography

```css
/* Headings */
h1, h2, h3 {
    font-family: 'DM Serif Display', serif;
}

/* Body */
body {
    font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

Two Google Fonts loaded via `<link rel="preload">` to avoid render-blocking. System font stack as fallback. DM Serif Display gives headings character; Source Sans 3 is highly readable at body sizes.

### Image Strategy

- Hero images: max 1200px wide, WebP, compressed to <100KB
- Inline images: max 800px wide, WebP, compressed to <50KB
- Always include `width` and `height` attributes
- Always include descriptive `alt` text (SEO + accessibility)
- Use Astro's built-in `<Image>` component for automatic optimization

---

## 11. Hosting & Deployment

### Platform: Vercel

| Host | Free Tier | Build Mins | Bandwidth | Custom Domain | API Routes | Verdict |
|------|-----------|-----------|-----------|---------------|------------|---------|
| Vercel | Unlimited | 6000/mo | 100GB/mo | Yes + free SSL | Serverless functions | **Chosen** |
| Cloudflare Pages | Unlimited sites | 500/mo | Unlimited | Yes + free SSL | Workers (different API) | Good |
| Netlify | 1 site | 300/mo | 100GB/mo | Yes + free SSL | Serverless functions | Good |

**Why Vercel:**
- First-class Astro support (official adapter, zero config)
- Global CDN + edge caching (fast for users in India, US, UK, everywhere)
- Free SSL
- Git-based deploys (push to GitHub → auto deploys)
- **Hybrid rendering** — static content pages (SEO) + serverless API routes (sales, bookings) on one platform
- Same platform as the admin tool — one dashboard, one set of concepts
- Generous free tier for a content site; Pro plan ($20/mo) if needed later for longer function timeouts

**Hybrid rendering explained:**
Astro's `hybrid` output mode lets you mark most pages as `prerender = true` (static HTML, built at deploy time) while adding server-rendered API routes for dynamic features later. Content pages stay static for SEO. Sales/booking APIs run as serverless functions.

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'hybrid',        // Static by default, opt-in server routes
  adapter: vercel(),
});
```

When you're ready for sales APIs:
```
src/pages/api/booking.ts     → Serverless function at /api/booking
src/pages/api/enquiry.ts     → Serverless function at /api/enquiry
src/pages/delhi/index.astro  → Still static HTML (prerendered)
```

No architecture change needed. Add API files, they just work.

### Deployment Workflow

```
Content (Markdown/JSON) → GitHub repo → Push → Vercel builds → CDN serves HTML
```

1. Content files live in GitHub repository
2. Push to `main` branch triggers build
3. Astro generates static HTML (+ serverless functions if any exist)
4. Vercel deploys static pages to global CDN, functions to serverless runtime
5. Live within 60 seconds of push

The admin tool (`admin.indiaesque.com`) also commits to this repo via GitHub API, triggering the same build pipeline automatically.

### Domain Setup

- Buy domain via any registrar (Namecheap, Porkbun, Google Domains — compare prices)
- Point DNS to Vercel (add domain in Vercel dashboard, update nameservers or DNS records)
- Enable HTTPS (automatic with Vercel)
- Set up `www` redirect to non-www (or vice versa — pick one, be consistent)
- Enable HSTS

---

## 12. Analytics & Search Console

### Google Search Console

- Verify domain ownership immediately
- Submit sitemap-index.xml
- Monitor: pages indexed, impressions, clicks, average position
- **Key report:** Pages with high impressions but low CTR = improve title/description
- **Key report:** Pages at position 8-20 = candidates for human editing (Round 2)

### Analytics

**Option A: Vercel Web Analytics** (recommended to start)
- Included with Vercel hosting, privacy-friendly
- No cookie banner required
- Page views, visitors, top pages, countries, referrers
- Minimal page speed impact

**Option B: Google Analytics 4** (add later if needed)
- More detailed: user journeys, conversion tracking, audience data
- Requires cookie consent banner (GDPR)
- Adds JavaScript to every page (small speed impact)
- Add via `<script>` tag, not Google Tag Manager (simpler, faster)
- **Required when sales features are added** — need conversion tracking

**Option C: Plausible or Fathom** (privacy-friendly alternative)
- Paid ($9-19/month) but no cookie banner needed
- Good middle ground between Vercel Analytics and GA4

### Key Metrics To Monitor Weekly

1. **Total pages indexed** (Search Console → Pages)
2. **Total impressions** (Search Console → Performance)
3. **Top queries** (what people are searching to find you)
4. **Average position per page** (track movement over time)
5. **Click-through rate** (which titles/descriptions are working)
6. **Top pages by traffic** (Analytics)
7. **404 errors** (Search Console → Pages → Not Found)

---

## 13. Content Injection Workflow

**How content gets from generation to published page.**

### Content File Format

Each page is a Markdown file with YAML frontmatter:

```markdown
---
title: "Is Delhi Safe For Tourists?"
description: "Delhi is generally safe for tourists. Main risks are petty scams, not violent crime. Tips for staying safe on the metro, in markets, and at night."
city: delhi
category: general
type: paa
datePublished: 2026-02-07
dateModified: 2026-02-07
status: machine-draft
schema:
  - FAQPage
  - Article
  - BreadcrumbList
relatedPages:
  - /delhi/is-delhi-safe-at-night/
  - /delhi/how-to-avoid-scams-delhi/
  - /delhi/is-delhi-safe-for-solo-female-travellers/
parentPage: /delhi/
faq:
  - question: "Is Delhi safe at night?"
    answer: "Parts of Delhi are safe at night. South Delhi, Connaught Place, and Khan Market areas are well-lit and populated. Avoid Old Delhi, Paharganj, and unfamiliar areas after dark. Use Uber or Ola, not street taxis."
  - question: "Is Delhi safe for solo female travellers?"
    answer: "Delhi is safe for solo female travellers who take standard precautions. Use the women-only metro carriage, dress modestly in traditional areas, book Uber/Ola at night, and stick to populated neighbourhoods."
---

**Delhi is generally safe for tourists.** Violent crime against visitors is rare. The main risks are petty theft, scams near popular tourist sites, and aggressive touts at places like Red Fort and Jama Masjid.

## Safety By Area

South Delhi neighbourhoods...

## Common Scams To Watch For

The most common scam targeting tourists...

[... rest of content in Markdown]
```

### Workflow

```
1. GENERATE    → AI creates Markdown file with frontmatter
2. VALIDATE    → Script checks: title length, description length, 
                  internal links exist, no duplicate slugs, 
                  schema fields populated, FAQ matches page content
3. COMMIT      → File added to GitHub repo in correct folder
4. BUILD       → Astro converts Markdown → HTML using template
5. DEPLOY      → Vercel serves new page via global CDN
6. INDEX       → Google Search Console pinged to recrawl
7. MONITOR     → Track indexing, impressions, position
8. HUMAN EDIT  → For pages showing traction (position 8-20)
```

### Validation Script Checks

Before any content file is committed, run automated checks:

- [ ] Title is under 60 characters
- [ ] Meta description is 120-155 characters
- [ ] City slug matches valid city list
- [ ] Category matches valid category list
- [ ] At least 3 internal links in body content
- [ ] No broken internal links (all referenced pages exist)
- [ ] FAQ answers match content visible on page
- [ ] No duplicate title or URL slug across entire site
- [ ] dateModified is current
- [ ] Minimum word count met (600 for PAA, 1500 for category, 2500 for hub)
- [ ] No AI-giveaway phrases ("in conclusion", "it's worth noting", "delve into")

---

## 14. File & Folder Structure

```
indiaesque/
├── astro.config.mjs              ← Astro configuration
├── package.json
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── llms.txt
│   ├── llms-full.txt
│   └── images/
│       ├── delhi/
│       ├── jaipur/
│       └── ...
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro      ← HTML shell (head, nav, footer)
│   │   ├── CityHub.astro         ← City hub template
│   │   ├── CategoryPage.astro    ← Category page template
│   │   └── PAAPage.astro         ← PAA answer page template
│   ├── components/
│   │   ├── Breadcrumbs.astro
│   │   ├── FAQ.astro             ← Renders FAQ section + generates schema
│   │   ├── RelatedPages.astro
│   │   ├── OperatorListing.astro ← Reusable operator card
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── content/
│   │   ├── config.ts             ← Content collection schema (TypeScript)
│   │   ├── delhi/
│   │   │   ├── _index.md         ← City hub content
│   │   │   ├── food-tours.md
│   │   │   ├── heritage-walks.md
│   │   │   ├── cooking-classes.md
│   │   │   ├── is-delhi-safe-for-tourists.md
│   │   │   ├── best-street-food-old-delhi.md
│   │   │   ├── how-many-days-in-delhi.md
│   │   │   └── ... (101 more PAA files)
│   │   ├── jaipur/
│   │   │   ├── _index.md
│   │   │   └── ...
│   │   ├── mumbai/
│   │   │   └── ...
│   │   ├── categories/           ← Cross-city category hubs
│   │   │   ├── food-tours-india.md
│   │   │   ├── cooking-classes-india.md
│   │   │   └── ...
│   │   └── blog/
│   │       ├── i-was-born-in-india.md
│   │       └── ...
│   ├── pages/
│   │   ├── index.astro           ← Homepage
│   │   ├── sitemap.astro         ← HTML sitemap page
│   │   └── [...slug].astro       ← Dynamic route that renders content files
│   └── styles/
│       └── main.css              ← Single CSS file, no framework needed
├── scripts/
│   ├── validate-content.ts       ← Pre-commit content validation
│   ├── generate-sitemap.ts       ← Custom sitemap logic if needed
│   └── ping-google.ts            ← Post-deploy indexing ping
└── data/
    ├── cities.json               ← City metadata (name, slug, coords, tier)
    ├── categories.json           ← Category metadata (name, slug, description)
    └── operators.json            ← Operator data (name, city, contact, status)
```

### Content Schema (TypeScript)

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const cityContent = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string().max(60),
        description: z.string().min(120).max(155),
        city: z.string(),
        category: z.string(),
        type: z.enum(['hub', 'category', 'paa', 'blog']),
        datePublished: z.string(),
        dateModified: z.string(),
        status: z.enum(['machine-draft', 'published', 'human-edited']),
        schema: z.array(z.string()),
        relatedPages: z.array(z.string()),
        parentPage: z.string(),
        faq: z.array(z.object({
            question: z.string(),
            answer: z.string()
        })).optional()
    })
});

export const collections = { delhi: cityContent, jaipur: cityContent /* ... */ };
```

This catches content errors at build time — if a Markdown file has a title over 60 characters or is missing a required field, the build fails before deploying broken content.

---

## Appendix: Pre-Launch Checklist

- [ ] Domain purchased and DNS configured
- [ ] Vercel project connected to GitHub repo
- [ ] HTTPS enabled
- [ ] robots.txt deployed and verified
- [ ] llms.txt deployed
- [ ] XML sitemap generating correctly
- [ ] HTML sitemap page live
- [ ] Google Search Console verified and sitemap submitted
- [ ] Analytics installed (Vercel Web Analytics minimum)
- [ ] Favicon and og:image set
- [ ] 404 page created
- [ ] All templates rendering correctly
- [ ] Schema markup validated with Google Rich Results Test
- [ ] PageSpeed score 90+ on mobile
- [ ] Internal links working (no 404s)
- [ ] Content validation script running pre-commit
- [ ] First batch of content (Delhi hub + 20 pages minimum) published
- [ ] Build and deploy tested end-to-end

---

## Appendix: Banned Phrases List

Filter these from machine-generated content. They signal AI authorship to both Google and readers.

```
"in conclusion"
"it's worth noting"
"delve into"
"vibrant tapestry"
"bustling metropolis"
"hidden gem" (use sparingly if at all)
"kaleidoscope of"
"rich tapestry"
"feast for the senses"
"a must-visit"
"nestled in"
"whether you're a ... or a ..."
"from ... to ..."  (as a diversity claim)
"embark on a journey"
"immerse yourself"
"plethora of"
"myriad of"
"a testament to"
"unparalleled"
"breathtaking"
"awe-inspiring"
"unforgettable experience"
"perfect blend of"
"seamlessly blends"
"caters to every taste"
```

Replace with specific, concrete language. Instead of "a hidden gem nestled in the heart of Old Delhi" → "a 40-seat restaurant on the second floor above a spice shop in Chandni Chowk."
