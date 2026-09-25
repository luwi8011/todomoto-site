# todomotoboulder.com — Phase 1 audit

Captured 2026-09-24 from the live site (WordPress + Elementor 4.1.4, Hello Elementor theme, behind Cloudflare, LiteSpeed host).

## Site shape

- 11 published pages, 0 blog posts, 24 media files. Full list: `docs/url-inventory.csv`.
- Nav: Home · Services · Who We Are · Contact Us. Footer: tagline, Instagram, "All Rights Reserved".
- 7 service pages, each 57–140 words; bottom of each is a wall of 7 red cross-link buttons.
- No bike inventory, no online booking. "Book your service now" goes to a 3-field contact form.
- **All URLs can be kept exactly as-is** in Astro (`/services/<slug>/`, trailing slash), so no redirects are needed for real pages.

## Plugins / features to replace

| On WP site | Replacement |
|---|---|
| Elementor + "PRO Elements" (GPL Elementor Pro clone) page builder | Astro components |
| Elementor form (name, email, message), **no spam protection** | Static form → host form handler or small serverless function, with Turnstile/honeypot |
| Google Maps iframe (`5589 arapahoe ave unit 108`) on Contact | Static map image + "Get directions" link; iframe only on click |
| WP Dark Mode plugin (floating toggle overlaps page text on mobile) | Drop; site is dark by design. Optionally respect `prefers-color-scheme` |
| GA4 (`G-SM1JKRPZ09`) **and** Plausible (self-hosted at `plausible.wilsonfabrication.com`) | Keep both (decided). One `<script>` each, loaded async. The WP Plausible plugin also loads a broken second script (`/js/.js`, HTTP 403) and publishes `grant@todomotoboulder.com` as a page property; neither carries over |
| Cloudflare email obfuscation, LiteSpeed cache, jQuery, SmartMenus | Not needed on a static site |
| Duplicate Post, Elementor AI | Not needed |

## Performance baseline (mobile)

Emulated mid-range phone on slow 4G (150 ms RTT, 1.6 Mbps, 4× CPU slowdown — the Lighthouse mobile profile). Google's "good" LCP threshold is 2.5 s.

| Page | First paint | LCP | Load | Requests | Transfer |
|---|---|---|---|---|---|
| Home | 8.1 s | **13.4 s** | 16.5 s | 55 | 1,443 KB |
| Tire change | 7.0 s | **10.2 s** | 12.0 s | 49 | 644 KB |
| Contact | 4.3 s | 4.6 s | 7.7 s | 54 | 655 KB |
| Who we are | 4.1 s | 4.6 s | 6.2 s | 49 | 910 KB |

Every page ships 18–21 stylesheets and 23–25 scripts. Google Fonts requests **all 18 weights/styles** of three families (Permanent Marker, Roboto Slab, Roboto). Unthrottled desktop numbers and full-page screenshots of every page (mobile + desktop): `docs/baseline/screenshots/`.

Lighthouse CLI could not run on this machine (Node.js not installed); the numbers above come from the same Chrome with the same throttling profile via DevTools.

### New Astro site, same test (2026-09-24)

Measured against the production build served by Cloudflare's local Pages runtime, same throttling. Analytics scripts (GA4, Plausible) only load in production and are not included.

| Page | First paint | LCP | Load | Requests | Transfer | Layout shift |
|---|---|---|---|---|---|---|
| Home | 1.9 s | **1.9 s** | 7.0 s | 15 | 463 KB | 0 |
| Tire change | 1.2 s | **1.9 s** | 5.0 s | 13 | 426 KB | 0 |
| Contact | 1.1 s | 1.1 s | 4.7 s | 12 | 357 KB | 0 |
| Who we are | 1.2 s | 1.8 s | 3.2 s | 10 | 396 KB | 0 |

After screenshots (desktop + mobile, every page): `docs/build-shots/`.

## SEO gaps

- No meta descriptions on any page.
- No Open Graph / social preview tags (links shared in iMessage/Facebook show no image).
- No structured data (schema.org `MotorcycleRepair` / `AutoRepair` with address, hours, phone).
- **Street address appears nowhere as text** — only inside the Google Maps embed on Contact. Search engines and customers can't read it.
- Zero images have alt text.
- Service H1s are written for "near me" keyword stuffing ("If you're searching for motorcycle tire repair near me…"). Reads awkwardly and no longer helps rankings.

## Content issues (fix during rewrite)

- `/services/motorcycle-repair/` H1: "Boulder **Col0rado**" (zero instead of o).
- Tire change H1: "Tire **c**hange" lowercase.
- Contact: "Give us a call! or fill out…", "**Were** always happy to help".
- Who We Are: sentence split across two paragraphs ("…signs reading "todo moto"" / "popped up along the way").
- Oil Change WP title has a trailing space.

## Design issues seen in screenshots

- Logo is a **black** motorcycle mark on a near-black header (#333) — nearly invisible.
- Dark-mode toggle floats over body text on mobile.
- All body text centered, including long paragraphs.
- Service pages show no images on the page; each has a featured image set in WordPress but not displayed. 7 identical red buttons dominate the page.
- Partner logos sit on mismatched white/transparent boxes.

## Media

Top-level page photos are real (in `src/assets/images/photos/`, renamed, with alt text written in the importer): night rider B&W (current hero), supermoto cornering, mechanic in shop, drivetrain detail, rear tire detail, adventure bike in snow, engine case teardown.
Brand: black and red variants of the mark and the wordmark (`src/assets/images/brand/`). No SVG exists; build from the PNGs. The black mark needs a light variant or the red one on dark backgrounds. Partner logos, including white variants for dark backgrounds (`src/assets/images/partners/`).

**Service-page images are stand-ins** and will be replaced with real photos later. Each service's frontmatter has `image`, `imageAlt`, and `imagePlaceholder: true`. Four are AI-generated (Gemini) and live in `src/assets/images/placeholders/`; Repair and Tire Change borrow real detail photos. E-bike and Custom Fabrication have no image yet. To replace one: drop the new photo in `src/assets/images/photos/`, point `image` at it, and delete `imagePlaceholder`.

Not imported (kept in `_archive/media/`):
- `IMG_6869.heic` (4.5 MB, Contact page featured image). HEIC won't display in most browsers, so it couldn't be previewed. Re-export it as JPG if it's worth using.
- An Elementor editor screenshot.

## Security note for the current WordPress site (while it is still live)

`/wp-json/wp/v2/users` and `/wp-sitemap-users-1.xml` publicly expose the admin login slug `granttodomotoboulder-com`. Low risk if the password is strong and 2FA is on. Resolved when WordPress is retired.

## Shop answers (2026-09-24)

All recorded in `src/data/site.json` unless noted.

1. ZIP: **80303**.
2. **Closed Sunday and Monday.** Open Tue–Fri 10:30–5:30, Sat 10:30–5.
3. Top-level page photos are real; service-page photos are stand-ins to be replaced later (see Media).
4. No SVG logo; use the PNGs.
5. Analytics: keep **both** GA4 and Plausible. Plausible instance is run by Wilson Fabrication, the site builder.
6. Contact form goes to **shop@todomotoboulder.com**.
7. No Google Business Profile yet; reviews and GBP linking come later. LocalBusiness structured data still ships at launch.
8. Labor rate: **$175/hour**, shown on Services and service pages.
9. New service: **Custom Fabrication** (`src/content/services/custom-fabrication.md`, new URL `/services/custom-fabrication/`). Copy is new: custom builds, cafe racers, and more. Review before launch.

Still open: real photos for the service pages.

## Repo contents after Phase 1–2

```
_archive/wp-json/     raw REST API JSON (pages, media, site)
_archive/html/        rendered HTML of every page
_archive/media/       every original upload
docs/                 this report, url-inventory.csv, baseline/
scripts/import-wp.mjs re-runnable importer (node scripts/import-wp.mjs [--fetch])
src/content/pages/    home, services, who-we-are, contact-us (Markdown, verbatim copy)
src/content/services/ 7 imported services + custom-fabrication (hand-written), with order + image in frontmatter
src/assets/images/    brand/, photos/, partners/, placeholders/ (renamed originals; Astro will optimize)
src/data/site.json    name, phone, email, form recipient, labor rate, address, hours, analytics, social, team, partners
```
