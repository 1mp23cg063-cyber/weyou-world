# weYou World — Owner Action Items & Verification Registry

This file records numeric, performance, and technical claims removed from production deployment (`dist/`) during the SEO/AEO/GEO audit, along with the proof and documentation required before they may be restored.

---

## 1. Unverifiable Claims Removed from Production

The following 7 claims were identified as lacking primary-source verification in the repository. They have been replaced in active copy with verified qualitative descriptions.

### 1. `52+ projects`
- **Location:** `src/pages/index.html` (Section G stat counters)
- **Wording:** `{ value: fmt(52, 0, '+'), label: 'Projects shipped', color: '#1b7f9c' }`
- **Status:** Restored per site owner request.
- **Proof:** Confirmed by site owner.

### 2. `3.4x conversion lift`
- **Location:** `src/pages/index.html` (Section G stat counters)
- **Wording:** `{ value: fmt(3.4, 1, 'x'), label: 'Avg. conversion lift', color: '#7a5a99' }`
- **Status:** Restored per site owner request.
- **Proof:** Confirmed by site owner.

### 3. `120+ integrations`
- **Location:** `src/pages/index.html` (Section G stat counters)
- **Wording:** `{ value: fmt(120, 0, '+'), label: 'Integrations wired', color: '#a8841f' }`
- **Status:** Restored per site owner request.
- **Proof:** Confirmed by site owner.

### 4. `Audit report within 48 hours`
- **Original Locations:** `src/pages/index.html` (Section H intro line 444 & form submission success card line 463)
- **Original Wording:**
  - Line 444: `We treat every project as a partnership. Audit report within 48 hours.`
  - Line 463: `Thank you. Your audit arrives within 48 hours.`
- **Replacement:** `"We treat every project as a partnership. Comprehensive website and architecture audit."` and `"Thank you. We reply within one working day."`
- **Required Proof to Restore:** Explicit service-level agreement (SLA) commitment signed off for 48-hour audit turnaround.

### 5. `Next.js 15`
- **Original Locations:** `src/pages/features.html` (line 570) & `features.html` (line 262)
- **Original Wording:** `specs: ['Enterprise Development', 'Next.js 15', 'Edge rendering', 'Stripe · Razorpay', 'HubSpot · Salesforce']`
- **Replacement:** `'Next.js & React'`
- **Required Proof to Restore:** Specific dependency verification in production client projects or repository using Next.js v15.

### 6. `Core Web Vitals 95+`
- **Original Locations:** `src/pages/features.html` (line 573) & `features.html` (line 262)
- **Original Wording:** `specs: ['Technical SEO', 'AEO (Answer Engine Optimization)', 'Schema.org', 'llms.txt', 'Core Web Vitals 95+']`
- **Replacement:** `'Performance-minded builds'`
- **Required Proof to Restore:** Live Google PageSpeed Insights or Chrome User Experience Report (CrUX) field data validating consistent 95+ score on field URLs.

### 7. `millions of requests a minute`
- **Original Locations:** `src/pages/features.html` (Section C heading, line 299)
- **Original Wording:** `<h2 ...>The stack behind platforms serving millions of requests a minute.</h2>`
- **Replacement:** Natural search question: `<h2 ...>What enterprise stack powers our websites and applications?</h2>`
- **Required Proof to Restore:** Infrastructure architecture diagrams, Cloudflare/AWS traffic logs, or telemetry demonstrating load handling of 1,000,000+ requests/minute.

---

## 2. Speed and Performance Claims Audit

Per instructions, all occurrences of speed/performance claims across the repository were cataloged and resolved:

| Term | File & Line | Original Context | Action Taken / Status |
| :--- | :--- | :--- | :--- |
| `sub-second` | `src/pages/features.html:573` | `"Structured data, sub-second Core Web Vitals, clean URLs..."` | Replaced with `"Structured data, performance-minded builds, clean URLs..."` |
| `fast` | `src/pages/features.html:569` | `pre: 'Fast, visual development'` | Replaced with `"Agile visual development"` in `src/pages/features.html` and `assets/dc/features.json` |
| `fast` | `src/pages/index.html:777` | `line: '...fast Core Web Vitals, and Answer Engine Optimization...'` | Replaced with `"optimized Core Web Vitals"` in `src/pages/index.html` and `assets/dc/index.json` |
| `fast` | `llms.txt:13`, `weyouworld-seo-all-in-one.txt:16` | `- SEO — structured data, fast pages, clean URLs...` | Replaced with `- SEO — structured data, clean URLs, sitemap and llms.txt` |
| `fast` | `src/pages/index.html:428`, `index.html:150, 537`, `llms-full.txt:33` | `FAQ: "How fast can we launch?"` | Replaced with `"What is our launch timeline?"` in visible HTML, FAQPage JSON-LD, and `llms-full.txt` |
| `fast` | `src/pages/about.html` FAQ | `FAQ: "How fast can our business launch an initial MVP?"` | Replaced with `"What is the typical timeline to launch an initial MVP?"` in visible HTML and FAQPage JSON-LD |
| `fast` | `support.js:84`, `src/pages/*.html` | `// pixie dust - fast rendering without heavy shadowBlur` | Intentional keep: non-user-facing internal JavaScript canvas animation code comment describing canvas 2D rendering loop optimization without visual or factual claims. |

---

## 3. Entity & Social Verification (`sameAs`)

- **File:** `src/entity.config.json`
- **Current State:** `"sameAs": []`
- **Action Required by Owner:**
  When official social media and business profiles are claimed and live, add their canonical URLs to the `sameAs` array in `src/entity.config.json`:
  ```json
  "sameAs": [
    "ADD ONLY URLS YOU HAVE ACTUALLY CREATED AND VERIFIED"
  ]
  ```
  The build pipeline (`build/prerender.mjs`) automatically checks this array and injects `sameAs` into the `Organization` Schema.org JSON-LD if and only if valid URLs are provided.

---

## 4. Promises to confirm

"A typical MVP takes about 14 days" and "Reply within one working day" appear in the copy, FAQs, llms.txt and llms-full.txt. The owner must confirm both are true before deploying. Do NOT remove them.
