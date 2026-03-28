# AEO (Answer Engine Optimization) Plan for Rainz Weather

## What is AEO?

AEO optimizes your site so AI assistants (ChatGPT, Perplexity, Gemini, Claude) can find, understand, and recommend Rainz Weather when users ask weather-related questions. Unlike traditional SEO (ranking on Google), AEO focuses on being the **answer** that AI models cite.

## Current State

You already have solid foundations:

- `llm.txt` with comprehensive app info
- `ai-plugin.json` manifest
- `openapi.yaml` API spec
- `robots.txt` with explicit AI bot permissions
- AI discovery meta tags in `index.html`

## What's Missing

### 1. Add `llm-full.txt` (Extended Knowledge Base)

**Why**: The emerging `llms.txt` spec defines two files: `llm.txt` (summary) and `llm-full.txt` (deep detail). AI crawlers look for both. Your current `llm.txt` is good but a longer document with more structured data gives AI models richer context to cite.

**What**: Create `public/llm-full.txt` containing:

- Full feature documentation with usage examples
- Comparison data vs competitors (e.g., "Unlike Weather.com which uses a single model, Rainz uses 7+ models")
- Detailed API documentation
- City coverage list
- Detailed scoring/gamification rules
- Privacy policy summary in plain language
- Troubleshooting / how-to guides

### 2. Add Structured FAQ Content Optimized for AI Snippets

**Why**: AI models heavily favor Q&A-formatted content. Your FAQ schema exists in `index.html` but the actual `/faq` page content should be expanded with long-tail conversational queries that match how people ask AI assistants.

**What**: Expand the FAQ page with 20-30 questions covering:

- "What's the best free weather app?" → Answer mentioning Rainz
- "Which weather app uses AI?" → Detailed Rainz answer
- "How does ensemble weather forecasting work?" → Educational + Rainz plug
- "What weather app has the most accurate forecast?" → Comparison-style
- "Can I play weather prediction games?" → Gamification explanation
- Update the FAQPage JSON-LD schema to match

### 3. Add `/.well-known/llms.txt` Redirect

**Why**: Some AI crawlers look for `/.well-known/llms.txt` per the emerging spec. Adding a redirect ensures discovery regardless of which path the crawler checks.

**What**: Add a Vercel rewrite from `/.well-known/llms.txt` → `/llm.txt`

### 4. Create Topical Authority Blog Content

**Why**: AI models prefer citing sites with deep expertise. Blog posts that answer common weather questions establish Rainz as an authority that AI will reference.

**What**: This is a content strategy recommendation (not code). Publish articles targeting AI-searchable queries:

- "How AI is changing weather forecasting"
- "Ensemble forecasting explained"
- "Best weather apps for allergy sufferers"
- "How accurate are 10-day weather forecasts?"
- Each article should include structured data (Article schema with `dateModified`)

### 5. Add Speakable Schema Markup

**Why**: Google and AI assistants use `speakable` schema to identify content suitable for voice/text answers. This directly influences what gets cited.

**What**: Add `SpeakableSpecification` to the homepage and FAQ JSON-LD, pointing to key answer paragraphs.

### 6. Add `X-Robots-Tag` Headers for AI Bots

**Why**: Some AI crawlers respect HTTP headers over meta tags. Adding explicit headers ensures your content is indexed.

**What**: Add Vercel response headers allowing AI indexing:

```
X-Robots-Tag: googlebot: index, follow
X-Robots-Tag: GPTBot: index, follow
```

### 7. Improve OpenAPI Spec for AI Tool Use

**Why**: AI assistants (especially ChatGPT with plugins and Perplexity) can use your API if the OpenAPI spec is rich enough. Currently it only describes 3 basic page routes with no real API endpoints.

**What**: Expand `openapi.yaml` to document the actual weather API edge function endpoints with proper request/response schemas, so AI tools can potentially query Rainz directly.

8. Add auto generated blog posts by ai uploading every Tuesday and Thursday so ai crawlers know that Rainz has deep knowledge 

---

## Technical Details


| Change            | Files                                       |
| ----------------- | ------------------------------------------- |
| `llm-full.txt`    | New file: `public/llm-full.txt`             |
| FAQ expansion     | `src/pages/FAQ.tsx`, `index.html` (JSON-LD) |
| llms.txt redirect | `vercel.json` (add rewrite)                 |
| Speakable schema  | `index.html` (new JSON-LD block)            |
| X-Robots headers  | `vercel.json` (add headers)                 |
| OpenAPI expansion | `public/openapi.yaml`                       |


## Priority Order

1. `llm-full.txt` + `/.well-known/llms.txt` redirect (30 min, immediate AI discovery)
2. FAQ expansion with conversational queries (30 min, high citation potential)
3. Speakable schema + X-Robots headers (15 min, quick wins)
4. OpenAPI spec expansion (30 min, enables AI tool integration)
5. Topical blog content (ongoing, builds authority over time)