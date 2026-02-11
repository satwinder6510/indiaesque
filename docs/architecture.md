# Indiaesque — Technical Architecture

**Reference document. Consult before making any structural changes.**

Last updated: 2026-02-11

---

## Table of Contents

1. Architecture Overview
2. Static Site Generator
3. URL Structure
4. Staycations System
5. Viator Tours Integration
5b. GetYourGuide (GYG) Integration
6. Page Templates & HTML Structure
6b. Homepage Architecture
7. CSS & Typography Architecture
8. Schema Markup (JSON-LD)
9. Internal Linking Architecture
10. Sitemap Strategy
11. AI Crawler Optimization
12. SEO Meta Tags
13. Performance Requirements
14. Hosting & Deployment
15. Analytics & Search Console
16. Content Admin — AI Generation & Versioning
17. Content Injection Workflow
18. File & Folder Structure

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

## 4. Staycations System

**Boutique hotel recommendations with rich content, managed via admin panel.**

### URL Structure

```
https://domain.com/staycations/                    ← Staycations index
https://domain.com/staycations/haveli-dharampura/  ← Individual staycation page
https://domain.com/staycations/neemrana-fort/      ← Individual staycation page
```

### Data Model

Staycations are stored as JSON in `india-experiences/src/data/staycations.json`:

```json
{
  "slug": "haveli-dharampura",
  "href": "/staycations/haveli-dharampura",
  "name": "Haveli Dharampura",
  "location": "Delhi",
  "description": "",
  "homePageImage": "/images/staycations/haveli-dharampura-homePageImage-homepage.jpg",
  "cardImage": "/images/staycations/haveli-dharampura-cardImage-card.jpg",
  "heroImage": "/images/staycations/haveli-dharampura-heroImage-hero.jpg",
  "whoItSuits": "Description of ideal guests...",
  "gallery": [],
  "overview": {
    "description": "Multi-paragraph property description...",
    "highlights": ["Highlight 1", "Highlight 2"],
    "checkIn": "14:00",
    "checkOut": "11:00"
  },
  "rooms": [
    {
      "name": "Heritage Room",
      "description": "Room description...",
      "amenities": ["AC", "WiFi"],
      "priceRange": "₹8,000-12,000"
    }
  ],
  "dining": {
    "description": "Dining options...",
    "restaurants": [
      { "name": "Lakhori", "cuisine": "North Indian" }
    ]
  },
  "destination": {
    "name": "Old Delhi",
    "description": "Area description...",
    "nearbyAttractions": ["Red Fort", "Jama Masjid"]
  },
  "booking": {
    "directBooking": true,
    "externalUrl": "https://..."
  },
  "tours": {
    "enabled": true,
    "source": "viator",
    "viatorDestinationId": 804,
    "viatorTagIds": [21911, 11866],
    "customTourIds": [],
    "gygEnabled": true,
    "gygTourIds": ["464596", "810824"]
  }
}
```

### Image Sizes

| Image Type | Dimensions | Aspect Ratio | Usage |
|------------|------------|--------------|-------|
| homePageImage | 640×960 | 2:3 | Homepage staycation cards |
| heroImage | 1400×600 | 7:3 | Detail page banner |
| cardImage | 800×500 | 8:5 | Listing thumbnails |

Images stored locally at `/public/images/staycations/` with naming convention:
`{slug}-{imageType}-{size}.jpg`

### Admin Panel Integration

Staycations are managed via the Next.js admin panel at `localhost:3000`:

- **Overview tab**: Name, location, description, highlights, who it suits
- **Images tab**: Upload/manage images with automatic resizing
- **Rooms tab**: Add/edit room types with amenities
- **Dining tab**: Restaurant information
- **Tours tab**: Viator integration settings

Changes saved via API commit directly to the GitHub repository, triggering automatic rebuild.

---

## 5. Viator Tours Integration

**Affiliate tours displayed on city pages and staycation pages via Viator Partner API v2.**

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              CITY & STAYCATION PAGES (Build Time)                │
│                                                                  │
│   1. Get destination ID for city                                 │
│   2. Call Viator products/search API                             │
│   3. Transform response (images, reviews, pricing)               │
│   4. Render in static HTML (no client JS)                        │
│   5. If API fails → section hidden (no mock data)                │
└──────────────────────────────────────────────────────────────────┘
         │
         │ Viator Partner API v2
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VIATOR API                                  │
│                                                                  │
│   POST /products/search                                          │
│   Headers: exp-api-key, Accept: application/json;version=2.0     │
│   Body: { filtering: { destination }, pagination, currency }     │
└──────────────────────────────────────────────────────────────────┘
```

### Where Viator is Used

| Page | Template | What shows |
|------|----------|------------|
| City pages (`/delhi/`, `/jaipur/`, etc.) | `[city].astro` | "More Experiences" section — 6 products with images, ratings, prices, booking links |
| Staycation pages (`/staycations/[slug]/`) | `[slug].astro` | "Experiences & Tours" section — uses `getDestinationId()` to look up city from shared DESTINATIONS map |

### Destination IDs

All 80 Indian CITY-type destinations from `GET /partner/destinations` (parent: India = 723). Full map in `viator.ts`. Key cities:

| City | Dest ID | City | Dest ID |
|------|---------|------|---------|
| Delhi | 804 | Jaipur | 4627 |
| Mumbai | 953 | Goa | 4594 |
| Agra | 4547 | Varanasi | 22015 |
| Kolkata | 4924 | Udaipur | 5106 |
| Kerala | 964 | Kochi | 952 |
| Chennai | 4624 | Bangalore | 5310 |
| Hyderabad | 22442 | Amritsar | 22306 |
| Rishikesh | 22733 | Shimla | 25944 |
| Srinagar | 23017 | Leh | 22569 |
| Jodhpur | 22142 | Darjeeling | 22035 |

Section auto-hides when a city returns 0 products. IDs refreshed 2026-02-11.

### API Configuration

- **Environment variable:** `VIATOR_API_KEY` (must be set in both `.env` locally and Vercel dashboard for production)
- **Access:** `import.meta.env.VIATOR_API_KEY || process.env.VIATOR_API_KEY`
- **Base URL:** `https://api.viator.com/partner`
- **Endpoint:** `POST /products/search`
- **Currency:** `INR`

### Request Body

```json
{
  "filtering": {
    "destination": 804
  },
  "pagination": {
    "start": 1,
    "count": 6
  },
  "currency": "INR"
}
```

### Response Structure (key fields)

```json
{
  "products": [
    {
      "productCode": "7667P2",
      "title": "...",
      "description": "...",
      "images": [
        {
          "isCover": true,
          "variants": [
            { "url": "https://media-cdn.tripadvisor.com/...", "width": 400, "height": 400 },
            { "url": "...", "width": 800, "height": 800 }
          ]
        }
      ],
      "reviews": {
        "sources": [
          { "provider": "VIATOR", "totalCount": 453, "averageRating": 4.9 }
        ]
      },
      "pricing": {
        "summary": { "fromPrice": 12961.22 },
        "currency": "INR"
      },
      "duration": { "fixedDurationInMinutes": 5760 },
      "productUrl": "https://www.viator.com/tours/..."
    }
  ]
}
```

### viator.ts Module

Located at `india-experiences/src/lib/viator.ts`:

```typescript
export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  duration: string;
  price: { amount: number; currency: string };
  rating: number;
  reviewCount: number;
  imageUrl: string;
  bookingLink: string;
}

export async function searchProducts(params: { destId: number; limit?: number }): Promise<ViatorProduct[]>
export function getDestinationId(city: string): number | undefined
```

**Key behaviour:** If `VIATOR_API_KEY` is not set or the API call fails, returns an empty array (no mock data). The section is conditionally rendered — hidden when empty.

### Image Selection

Products return images with `isCover` flag and `variants[]` array (multiple sizes). The `selectBestImage` function picks the cover image and selects the smallest variant >= 600px wide for cards.

### Affiliate Revenue

Viator Partner Program:
- Commission: 8% of booking value
- Cookie duration: 30 days
- Payment: Monthly via PayPal

---

## 5b. GetYourGuide (GYG) Integration

**Availability widget on staycation pages only. Inline booking — users book without leaving the site.**

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              STAYCATION PAGE ([slug].astro)                       │
│                                                                  │
│   1. Read gygTourIds from staycations.json                       │
│   2. For each tour ID, render <GygWidget tourId={id} />          │
│   3. GYG JS script (pa.umd.production.min.js) loads widget       │
│   4. User sees inline availability calendar                      │
│   5. Booking happens inside iframe — user stays on site          │
└──────────────────────────────────────────────────────────────────┘
```

### Where GYG is Used

| Page | What shows |
|------|------------|
| Staycation pages only | Availability widget(s) after "Book your stay" section |
| City pages | NOT used (Viator only) |

### Partner ID

`OBZX5NA` — set as `GYG_PARTNER_ID` env var (fallback hardcoded)

### Widget Type

**Availability widget** (not activities widget):
- `data-gyg-widget="availability"` — shows calendar with live availability
- `data-gyg-href="https://widget.getyourguide.com/default/availability.frame"`
- Requires a specific `data-gyg-tour-id` per experience

### GygWidget.astro Component

Located at `india-experiences/src/components/GygWidget.astro`:

```astro
---
interface Props {
  tourId: string;
  currency?: string;
  variant?: 'horizontal' | 'vertical';
}
const { tourId, currency = 'INR', variant = 'horizontal' } = Astro.props;
const partnerId = import.meta.env.GYG_PARTNER_ID || 'OBZX5NA';
---
<div
  data-gyg-href="https://widget.getyourguide.com/default/availability.frame"
  data-gyg-tour-id={tourId}
  data-gyg-widget="availability"
  data-gyg-variant={variant}
  data-gyg-partner-id={partnerId}
  data-gyg-locale-code="en-US"
  data-gyg-currency={currency}
>
```

### GYG Script

Loaded once in `BaseLayout.astro` at the **end of `<body>`** (not in `<head>` — causes blank widgets):

```html
<script async defer src="https://widget.getyourguide.com/dist/pa.umd.production.min.js"
  data-gyg-partner-id="OBZX5NA" is:inline></script>
```

The `is:inline` attribute prevents Astro from bundling/processing the external script.

### Tour IDs Configuration

Managed via admin panel. Stored in `staycations.json`:

```json
{
  "tours": {
    "gygEnabled": true,
    "gygTourIds": ["464596", "810824"]
  }
}
```

Multiple tour IDs supported — each renders a separate availability widget. Admin UI has add/remove controls for tour IDs.

### Rendering in [slug].astro

```astro
{(toursConfig.gygEnabled !== false) && toursConfig.gygTourIds?.length > 0 && (
  toursConfig.gygTourIds.filter((id: string) => id).map((tourId: string) => (
    <GygWidget tourId={tourId} />
  ))
)}
```

### Affiliate Revenue

GetYourGuide Partner Program:
- Commission: ~8% of booking value
- Attribution via partner ID in widget

---

## 6. Page Templates & HTML Structure

### 6.1 Base HTML Template (every page)

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

### 6.2 Breadcrumbs (every page except homepage)

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

### 6.3 City Hub Page Template

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

### 6.4 Category Page Template

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

### 6.5 PAA Answer Page Template

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

## 6b. Homepage Architecture

The homepage (`pages/index.astro`) displays curated content sections with horizontal scroll carousels.

### Data Sources

| Section | Data File | Selection Logic |
|---------|-----------|-----------------|
| Top Cities | `data/cities.json` | First 8 cities (`slice(0, 8)`) |
| Staycations | `data/staycations.json` | All staycations |
| Experience Types | `data/experiences.json` | All experiences |

### Cities Display Logic

```javascript
const popularLocations = citiesData.slice(0, 8).map(city => ({
  name: city.name.toUpperCase(),
  image: city.cardImage,
  href: `/${city.slug}/`
}));
```

**To change which cities appear:** Reorder entries in `cities.json` — the first 8 are displayed. The `tier` field is metadata only; display order is determined by array position.

### Horizontal Scroll Pattern

Both "Top Cities" and "Staycations" sections use a horizontal scroll carousel with arrow navigation.

**Required CSS structure:**

```css
/* Wrapper — DO NOT add overflow:hidden, it breaks scroll calculation */
.locations-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* Scroll container — flex:1 and min-width:0 are critical */
.locations-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;  /* Allows flex item to shrink below content size */
  scrollbar-width: none;
  scroll-behavior: smooth;
}

/* Cards must not shrink */
.location-card {
  flex: 0 0 auto;
  width: 500px;  /* Fixed width */
}
```

**Critical rules:**
- **Never add `overflow: hidden` to the wrapper** — it clips the scroll container and breaks `scrollWidth` calculation
- **Scroll container needs `flex: 1; min-width: 0;`** — ensures proper width calculation within flex parent
- **Cards need `flex: 0 0 auto`** — prevents cards from shrinking

### Arrow Visibility Logic

```javascript
function updateArrows() {
  const scrollLeft = scrollContainer.scrollLeft;
  const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

  // Hide left arrow at start
  leftArrow.style.display = scrollLeft <= 0 ? 'none' : 'flex';

  // Hide right arrow at end (with 10px threshold)
  rightArrow.style.display = maxScroll > 10 && scrollLeft < maxScroll - 1 ? 'flex' : 'none';
}
```

### City Data Structure

```json
{
  "name": "Delhi",
  "slug": "delhi",
  "tier": 1,
  "lat": "28.6139",
  "lng": "77.2090",
  "description": "India's capital city...",
  "heroImage": "/images/cities/delhi-hero.jpg",
  "cardImage": "/images/cities/delhi-card.jpg",
  "bestMonths": [10, 11, 12, 1, 2, 3],
  "goodMonths": [4, 9]
}
```

| Field | Usage |
|-------|-------|
| `cardImage` | Homepage "Top Cities" carousel (aspect ratio 16:10) |
| `heroImage` | City hub page banner |
| `bestMonths` | Displayed on city pages as optimal travel months |
| `tier` | Metadata for prioritization (1=major, 2=secondary) — does not affect homepage display |

---

## 7. CSS & Typography Architecture

### 7.1 Fonts

Three self-hosted font families loaded via `@font-face` in `src/styles/main.css`:

| Font | Role | Weights | CSS Variable |
|------|------|---------|--------------|
| **Muli** | Body text | 300, 400, 600, 700 | `--font-body` |
| **Oswald** | Headings | 300, 400, 500, 700 | `--font-heading` |
| **Benton Sans** | Accent text | 300, 400, 500, 700 | `--font-accent` |

Font files stored at `/public/fonts/{family}/`. No Google Fonts, no external requests.

**Important:** All templates must reference these fonts. Never use `'Inter'`, `'Playfair Display'`, or other unloaded fonts — they silently fall back to system fonts and break visual consistency.

### 7.1b Header Logo

The site logo "INDIA ESQUE" (with space) uses Benton Sans in the header:

| Breakpoint | Font Size | Letter Spacing |
|------------|-----------|----------------|
| Mobile | 26px | 0.3em |
| Desktop (768px+) | 32px | 0.3em |

**File:** `src/components/Header.astro`

```css
.header-logo {
  font-family: 'Benton Sans', sans-serif;
  font-size: 26px;      /* Mobile */
  font-weight: 300;
  letter-spacing: 0.3em;
  color: #E9CDB0;       /* Gold accent */
}

@media (min-width: 768px) {
  .header-logo {
    font-size: 32px;    /* Desktop */
  }
}
```

### 7.2 Global CSS Reset

`src/styles/main.css` contains a targeted reset:

```css
*, *::before, *::after { box-sizing: border-box; }

body, h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd { margin: 0; }
ul, ol { margin: 0; padding: 0; }
ul, ol { list-style: none; }
```

**This means all margins and list styles must be explicitly set** in component styles — nothing inherits browser defaults.

### 7.3 Astro Scoped Styles & `:global()`

Astro's `<style>` tags are **scoped by default** — each CSS selector gets a unique `data-astro-cid-xxx` attribute appended at build time.

**Critical rule:** When a component renders markdown content via `<Content />` or `<HubContent />`, the rendered HTML elements (p, h2, ul, etc.) **do not have the scoping attribute**. This means scoped styles will not match them.

**Solution:** Use `:global()` for any CSS that targets markdown-rendered children:

```css
/* WRONG — scoped styles won't match markdown <p> tags */
.article-content p { margin: 0 0 20px; }

/* CORRECT — :global() bypasses scoping on the child selector */
.article-content :global(p) { margin: 0 0 20px; }
```

The parent class (`.article-content`, `.hub-content-inner`, `.prose`) remains scoped — only the child selectors need `:global()`.

### 7.4 Style Locations

| Page Type | Template | Wrapper Class | Style Location |
|-----------|----------|---------------|----------------|
| City hub (main) | `pages/[city].astro` | `.hub-content-inner` | Scoped `<style>` in page |
| City hub (sub) | `layouts/CityHub.astro` | `.article-content` | Scoped `<style>` in layout |
| Category | `layouts/CategoryPage.astro` | `.article-content` | Scoped `<style>` in layout |
| PAA article | `layouts/PAAPage.astro` | `.article-content` | Scoped `<style>` in layout |
| Journal | `pages/journal/[slug].astro` | `.prose` | Scoped `<style>` in page |

All use `:global()` for markdown child elements. Each provides styles for at minimum: `p`, `h2`, `h3`, `h4`, `ul`, `ol`, `li`, `strong`, `a`, `blockquote`.

### 7.5 Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--black` | `#000000` | — |
| `--white` | `#ffffff` | Page backgrounds |
| `--gold` | `#E9CDB0` | CTA buttons, accent |
| `--gray-100` | `#f3f4f6` | Light backgrounds |
| `--gray-200` | `#e5e7eb` | Borders |
| `--gray-400` | `#9ca3af` | Muted text |
| `--gray-500` | `#6b7280` | Secondary text |
| `--gray-600` | `#4b5563` | Body text |
| `--gray-900` | `#111827` | Headings, primary text |
| Teal | `#0d9488` | Links, accents (hub page) |
| Coral | `#e07060` | Links, accents (sub-page layouts) |
| Dark teal | `#2a9d8f` | Blockquote borders, best-time bars |

---

## 8. Schema Markup (JSON-LD)

**All schema goes in `<head>` as JSON-LD. Not microdata, not RDFa. JSON-LD is what Google recommends and is cleanest to maintain at scale.**

### 7.1 FAQPage Schema (every page with FAQ section)

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

### 7.2 TouristDestination Schema (city hub pages)

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

### 7.3 Article Schema (every content page)

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

### 7.4 BreadcrumbList Schema (every page)

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

### 7.5 Schema Rules

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

## 8. Internal Linking Architecture

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

## 9. Sitemap Strategy

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

## 10. AI Crawler Optimization

**AI search (Perplexity, ChatGPT search, Google AI Overviews) is a growing traffic source. Optimize for it explicitly.**

### 10.1 robots.txt

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

### 10.2 llms.txt

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

### 10.3 llms-full.txt

Extended version at `https://domain.com/llms-full.txt` — can contain the full sitemap with page descriptions. AI systems may use this to understand the entire site.

### 10.4 Content Structure For AI Readability

AI systems extract information best from:

1. **Direct answers at the top** — First sentence should answer the page's core question
2. **Clear heading hierarchy** — h1 → h2 → h3, no skipping levels
3. **Specific data in plain text** — "₹2,500 ($30) per person for 3 hours" not just "affordable"
4. **Lists and structured data in HTML** — Not hidden in images or PDFs
5. **No content gating** — No popups, no "sign up to read more", no interstitials

---

## 11. SEO Meta Tags

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

## 12. Performance Requirements

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
- [ ] **Web fonts self-hosted** (three families: Muli, Oswald, Benton Sans — loaded via @font-face with `font-display: swap`)
- [ ] **Gzip/Brotli compression enabled** (CDN handles this)
- [ ] **Cache headers set** (static assets: 1 year, HTML: 1 hour)

### Typography

```css
/* Headings */
h1, h2, h3, h4, h5, h6 {
    font-family: 'Oswald', sans-serif;
    font-weight: 400;
    line-height: 1.2;
}

/* Body */
body {
    font-family: 'Muli', sans-serif;
    font-size: 16px;
    line-height: 1.6;
}
```

Three self-hosted font families loaded via `@font-face` in `main.css`. No Google Fonts, no external requests. See Section 7 for full typography details.

### Image Strategy

- Hero images: max 1200px wide, WebP, compressed to <100KB
- Inline images: max 800px wide, WebP, compressed to <50KB
- Always include `width` and `height` attributes
- Always include descriptive `alt` text (SEO + accessibility)
- Use Astro's built-in `<Image>` component for automatic optimization

---

## 13. Hosting & Deployment

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

**Server output with prerendering:**
Astro's `output: 'server'` mode with `@astrojs/vercel` adapter. Pages with `export const prerender = true` are built as static HTML at deploy time. Pages/routes without it run as serverless functions.

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://indiaesque.com',
  trailingSlash: 'always',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
  build: { format: 'directory' },
});
```

**Current rendering modes:**

| Route | Mode | Notes |
|-------|------|-------|
| `[city].astro` | `prerender = true` | Static — Viator API called at build time |
| `staycations/[slug].astro` | `prerender = true` | Static — Viator + GYG data at build time |
| `api/viator/tours.ts` | `prerender = false` | Serverless function (dynamic) |
| All content pages | `prerender = true` | Static HTML |

**Environment variables for build time:**
Since prerendered pages call APIs at build time, env vars must be set in the **Vercel dashboard** (not just `.env`):

| Variable | Where set | Used by |
|----------|-----------|---------|
| `VIATOR_API_KEY` | Vercel dashboard + `.env` | `viator.ts` — accessed via `import.meta.env` and `process.env` |
| `GYG_PARTNER_ID` | Vercel dashboard + `.env` | `GygWidget.astro` — accessed via `import.meta.env` |

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

## 14. Analytics & Search Console

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

## 16. Content Admin — AI Generation & Versioning

The admin panel (`admin/`) manages city hub content through a multi-tab interface at `/content/[city]`. Content is stored as JSON in `india-experiences/src/data/content/{city}/hub.json` and committed to GitHub via the API.

### 16.0 Content Flow: Admin → City Page

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT FLOW                                │
│                                                                  │
│   Admin Panel                     City Page ([city].astro)       │
│   ───────────                     ────────────────────────       │
│   1. Generate/edit content        1. import.meta.glob() loads    │
│   2. Publish version                 data/content/*/hub.json     │
│   3. Save to hub.json             2. Read generatedContent field │
│      via GitHub API               3. Parse markdown with marked  │
│                                   4. Render HTML via set:html    │
└─────────────────────────────────────────────────────────────────┘
```

**Key files:**

| Location | Purpose |
|----------|---------|
| `admin/src/app/api/content/route.ts` | Saves hub.json via GitHub API |
| `india-experiences/src/data/content/{city}/hub.json` | Stores content + versions |
| `india-experiences/src/pages/[city].astro` | Reads hub.json, renders markdown |

**City page content loading:**

```javascript
// [city].astro loads hub content at build time
const hubModules = import.meta.glob('../data/content/*/hub.json', { eager: true });
const hubPath = `../data/content/${city}/hub.json`;
const hubData = hubModules[hubPath];

if (hubData?.default?.generatedContent) {
  hubContent = await marked(hubData.default.generatedContent);
}
```

**Fallback behavior:** If no hub.json exists for a city, the page displays a simple intro paragraph from `cities.json` description.

### 16.1 Content Versioning

Every content change creates a `ContentVersion` stored in the hub's `versions` array (max 20 retained):

```typescript
interface ContentVersion {
  id: string;            // e.g. "v_1707123456_abc1234"
  content: string;       // Full markdown content
  wordCount: number;
  createdAt: string;     // ISO timestamp
  source: "ai" | "manual";
  generationConfig?: {
    tone: string;
    wordCount: number;
    keywords: string[];
    paaQuestionIds: string[];
    expandDirection?: string;  // Set for expand-generated versions
  };
  note?: string;         // User-provided or auto-generated note
}
```

The `currentVersionId` field on the hub tracks which version is active. Users can preview any version and revert (which creates a new version from the old content).

### 16.1b City Facts (Current Information)

AI models have knowledge cutoffs and may generate outdated information. The `facts` field in hub.json provides editorial control over current information that gets injected into every generation prompt.

**Admin UI:** Content → [City] → **Facts** tab

The Facts tab allows adding, editing, and deleting facts without editing JSON directly. Each fact is a text field that can be modified inline.

**Example hub.json facts:**
```json
{
  "slug": "goa",
  "facts": [
    "Goa has TWO airports: Dabolim (GOI) in south Goa and Manohar International (GOX) at Mopa in north Goa",
    "Mopa airport opened January 2023, is closer to North Goa beaches",
    "Current taxi rates 2026: Dabolim→Calangute ₹1500, Mopa→Calangute ₹900"
  ]
}
```

**How it works:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     FACTS INJECTION FLOW                        │
│                                                                 │
│  Facts Tab          hub.json           Generation Prompt        │
│  ─────────          ────────           ─────────────────        │
│  Add/edit facts  →  facts: [...]   →   CRITICAL FACTS:          │
│  Save Changes                          - fact 1                 │
│                                        - fact 2                 │
│                                        (MUST include these)     │
└─────────────────────────────────────────────────────────────────┘
```

1. Admin adds facts via the **Facts** tab
2. Facts saved to `hub.json` via Save Changes button
3. When generating content, facts passed to `buildGeneratePrompt()`
4. Prompt includes facts as "CRITICAL FACTS (verified current information - MUST include these)"
5. Claude incorporates these facts into generated content
6. Facts persist across regenerations, ensuring consistency

**Prompt injection example:**
```
Today's date is 2026-02-11. Use your most current knowledge.
The guide should be for 2026, not any earlier year.

CRITICAL FACTS (verified current information - MUST include these):
- Goa has TWO airports: Dabolim (GOI) and Manohar International (GOX) at Mopa
- Mopa airport opened January 2023, closer to North Goa beaches
```

**Best practices for facts:**
- Include information that changes (prices, new infrastructure, policy changes)
- Be specific with dates, prices, names
- Update facts when information changes
- Keep each fact concise (one fact = one piece of information)
- Add year to time-sensitive info (e.g., "taxi rates 2026: ₹X")

### 16.1c Accuracy Safeguards

The generation prompt includes multiple safeguards to reduce outdated or inaccurate content:

**1. Uncertainty Flagging**
Claude marks uncertain information inline:
```
The metro runs from 5 AM to midnight [VERIFY: check current timings].
```

**2. Date-Stamped Prices**
All prices include the year automatically:
```
Taxi from airport: ₹800-1200 (2026 rates)
```

**3. Range-Based Pricing**
Uses ranges instead of specific amounts to account for variation:
```
₹800-1200 (not ₹950)
```

**4. Hedging Language**
Time-sensitive info uses cautious language:
```
"typically open 9 AM - 5 PM"
"usually costs around ₹500"
"check current rates before visiting"
```

**5. Facts to Verify Section**
Every generated article ends with a verification checklist:
```markdown
## Facts to Verify Before Publishing
- Airport taxi rates (₹800-1200 mentioned)
- Metro timings (5 AM - midnight mentioned)
- Mopa airport terminal facilities
- Current visa-on-arrival policy
- Restaurant X still operating
```

**6. No Invented Names**
Prompt instructs Claude not to invent specific business names (restaurants, hotels) unless confident they exist.

**Editorial workflow:** After generation, review the `[VERIFY: ...]` tags and "Facts to Verify" section. Update or remove uncertain claims before publishing.

### 16.2 PAA Research

The **PAA Research** tab sends city names to Claude to generate 15–20 "People Also Ask" questions across categories (transport, best time, food, safety, etc.). Questions are persisted to the hub's `paaResearch` field and can be individually selected/deselected for generation.

API: `POST /api/content/research` with `action: "research"` or `action: "save"`

Bulk research across multiple cities: `action: "bulk-research"`

### 16.3 Prompt Builder

Shared utility at `admin/src/lib/promptBuilder.ts` — single source of truth for prompt construction, used by both the API (server-side execution) and the UI (client-side preview).

**Exports:**

| Function | Purpose |
|----------|---------|
| `buildGeneratePrompt()` | Constructs the full hub content generation prompt from selected PAA questions, tone, word count, and keywords |
| `buildExpandPrompt()` | Constructs the expand prompt that includes existing content between delimiters with instructions to add new material without duplicating |
| `TONE_PROMPTS` | Map of tone values to natural-language style instructions |

**Available tones:** conversational, professional, enthusiastic, practical, storytelling

**Default tone:** `professional` — authoritative and well-researched style suitable for a travel publication

### 16.4 Content Generation

The **Generation** tab provides two modes:

**Generate Content** — Creates fresh hub content from selected PAA questions:
1. User selects PAA questions, configures tone/wordCount/keywords
2. Live prompt preview shows the exact prompt (collapsible, updates reactively)
3. On generate: calls `POST /api/content/research` with `action: "generate"`
4. Response content is set in the editor and auto-published as a new AI version
5. UI switches to the editor tab

**Expand Content** — Adds to existing content without duplicating (only visible when content exists):
1. User types a free-form expansion direction (e.g. "Add a section about monsoon festivals")
2. Configures additional word count (200–2000) — uses same tone/keywords from above
3. Live expand prompt preview shows the full prompt including existing content
4. On expand: calls `POST /api/content/research` with `action: "expand"`
5. Claude receives existing content between delimiters with instructions to return the complete merged document
6. Response replaces editor content and is auto-published with a note like "Expanded: {direction}"

**Key design decisions:**
- Prompt preview is client-side (deterministic from inputs, no secrets) — no extra API call needed
- Expand returns the full merged document, not a diff — simpler and more reliable; version history handles comparison
- `max_tokens: 16384` for expand to accommodate existing content + new additions
- Shared prompt builder ensures the preview matches exactly what the server sends to Claude

### 16.5 Admin File Structure

```
admin/src/
├── lib/
│   ├── promptBuilder.ts          ← Shared prompt construction (generate + expand)
│   ├── github.ts                 ← GitHub API client (readJSON, writeJSON)
│   └── auth.ts
├── app/
│   ├── api/content/
│   │   ├── route.ts              ← CRUD + versioning (GET, POST, PUT)
│   │   └── research/route.ts     ← PAA research, generate, expand actions
│   └── content/[city]/
│       ├── page.tsx              ← City hub editor (tabs, state, handlers)
│       └── components/
│           ├── GenerationControls.tsx  ← Tone/wordCount/keywords + prompt preview + expand UI
│           ├── PAAResearchPanel.tsx    ← PAA question research + selection
│           ├── MarkdownEditor.tsx      ← Content editor with preview
│           └── VersionHistory.tsx      ← Version list, preview, revert
```

---

## 17. Content Injection Workflow

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

## 18. File & Folder Structure

```
indiaesque/                           ← Monorepo root
├── docs/
│   └── architecture.md               ← This file
│
├── india-experiences/                ← Astro static site (port 4321)
│   ├── astro.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                          ← VIATOR_API_KEY, GYG_PARTNER_ID
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   ├── llms.txt
│   │   └── images/
│   │       ├── staycations/          ← Staycation images (local)
│   │       ├── delhi/
│   │       └── ...
│   ├── src/
│   │   ├── layouts/
│   │   │   └── BaseLayout.astro      ← GYG script loaded at end of <body>
│   │   ├── components/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   └── GygWidget.astro       ← GYG availability widget component
│   │   ├── lib/
│   │   │   └── viator.ts             ← Viator products/search API client
│   │   ├── data/
│   │   │   ├── staycations.json      ← Staycation data (managed by admin) — includes gygTourIds
│   │   │   ├── cities.json           ← City metadata (hero images, descriptions)
│   │   │   └── experiences.json
│   │   ├── content/
│   │   │   ├── config.ts
│   │   │   ├── delhi/
│   │   │   │   ├── _index.md
│   │   │   │   └── ...
│   │   │   ├── jaipur/
│   │   │   ├── mumbai/
│   │   │   └── blog/
│   │   ├── pages/
│   │   │   ├── index.astro           ← Homepage
│   │   │   ├── [city].astro          ← City hub pages (Viator products)
│   │   │   ├── staycations/
│   │   │   │   └── [slug].astro      ← Staycation detail (Viator + GYG widgets)
│   │   │   ├── api/
│   │   │   │   └── viator/
│   │   │   │       └── tours.ts      ← Dynamic API route (prerender=false)
│   │   │   └── [...slug].astro
│   │   └── styles/
│   │       └── main.css
│   └── scripts/
│       └── validate-content.ts
│
├── admin/                            ← Next.js admin panel (port 3000)
│   ├── package.json
│   ├── next.config.ts
│   ├── .env.local                    ← ANTHROPIC_API_KEY, GITHUB_TOKEN, etc.
│   ├── public/
│   │   └── uploads/                  ← Temporary image uploads
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              ← Dashboard
│   │   │   ├── login/page.tsx
│   │   │   ├── staycations/
│   │   │   │   ├── page.tsx          ← Staycations list
│   │   │   │   └── [slug]/page.tsx   ← Staycation editor (5 tabs)
│   │   │   ├── city/[slug]/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       ├── staycations/
│   │   │       │   ├── route.ts      ← List/create staycations
│   │   │       │   ├── [slug]/route.ts
│   │   │       │   └── [slug]/images/route.ts
│   │   │       ├── cities/
│   │   │       └── generate-page/
│   │   ├── lib/
│   │   │   ├── github.ts
│   │   │   ├── claude.ts
│   │   │   └── auth.ts
│   │   └── middleware.ts
│   └── prompts/
│       ├── research.md
│       └── paa.md
│
└── data/                             ← Shared data (in repo root)
    ├── cities.json
    └── content-banks/
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
