# DevArea Tools — static production source

A handcrafted, mobile-first static site for `tools.devareayt.in`, designed around the supplied visual references: editorial typography, quiet light/dark transitions, functional tool panels, structured tool directory, and long-form technical storytelling. The implementation avoids external UI libraries, remote font requests, backend tool APIs and star-shaped decorative icons.

## Pages

- `/` — homepage and tool directory.
- `/jwt-tools/` — browser-based JWT inspector and formatter.
- `/css-clamp-generator/` — responsive CSS clamp calculator and preview.
- `/blog/` — searchable article library.
- `/blog/jwt-token-parts/`
- `/blog/jwt-token-format/`
- `/blog/jwt-fields/`
- `/blog/jwt-beautifier/`
- `/blog/css-clamp-generator/`
- `/blog/css-clamp-calculator/`
- `/blog/fluid-typography/`
- `/blog/css-clamp-examples/`
- `/about/`, `/contact/`, `/security/`, `/privacy-policy/`, `/terms/`, `/cookies/`, `/press/`, plus custom `404.html`.

## Tool behavior

### JWT inspector
- Accepts a 3-part compact JWS-style token and optional `Bearer` prefix.
- Decodes header/payload as UTF-8 JSON and shows each segment.
- Explains common `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti` claims and interprets common NumericDate claims.
- Copies header/payload/token/inspection JSON and downloads a JSON report.
- Does **not** verify token signatures, issuer, audience, accepted algorithms or authorization policies. It doesn't decrypt compact 5-part JWE tokens.
- Processing is client-side; the tool does not call a decode endpoint.

### CSS clamp generator
- Validates sizes and viewport bounds.
- Computes a linear `vw` coefficient and intercept from two size/viewport endpoints.
- Supports rem or px output, configurable root-size assumption/precision, common presets, property choice, a live viewport preview, evaluated size, copy controls and CSS download.
- The generated code must still be tested in the actual project, including browser zoom and text resizing.

## Run locally

Requires Python 3 for a basic static server and Node.js for automated tests.

```bash
npm test
npm run serve
```

Open `http://localhost:8000`.

## Deploy to Vercel

1. Push this folder's contents to a Git repository.
2. Import the repository into Vercel.
3. Choose **Other** / no framework preset; no build command is required. Output directory is the repository root (`.`).
4. Add `tools.devareayt.in` under Project → Settings → Domains. Configure the DNS record Vercel provides for that subdomain. Keep the existing apex/www agency DNS records unchanged.
5. Once HTTPS is active, submit `https://tools.devareayt.in/sitemap.xml` in Google Search Console.
6. Inspect the three main URLs and confirm the declared canonical matches the preferred domain. If deploying under a different URL first, update the `BASE` constant in `build_site.py`, canonical tags, JSON-LD and `sitemap.xml` before publication.

All internal links are root-relative. This expects the site to run at the domain root of the dedicated subdomain, not under a path prefix.

## SEO and content notes

- Unique titles, descriptions, canonical URLs, Open Graph metadata, `WebApplication`, `TechArticle`, `BreadcrumbList` and relevant FAQ schema are included.
- `/sitemap.xml` lists intended indexable pages. `/robots.txt` references it.
- `KEYWORD-RESEARCH.md` documents qualitative SERP findings, query intent, sources, and a launch measurement plan. It explicitly does not invent search-volume estimates.
- The site points to owned resources for further reading. To earn inbound backlinks, edit the relevant existing owned articles to link contextually to this site; the new site's outgoing links do not create backlinks by themselves.
- Privacy/security language describes the included static source. Update it if analytics, forms, accounts, APIs or other integrations are added.

## Before launch

- Confirm the contact email and branding.
- Run tests and check the site in current Chrome, Firefox and Safari if available.
- Run PageSpeed Insights / Lighthouse against the deployed domain. No Lighthouse result is guaranteed by the code alone.
- Inspect structured data and canonical tags after production deployment.
- If actual analytics or form processing is added, update privacy/cookie pages and the related code.
