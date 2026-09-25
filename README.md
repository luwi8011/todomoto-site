# todomotoboulder.com

Astro static site for Todo Moto, hosted on Cloudflare Pages. The contact form posts to a
Cloudflare Pages Function (`functions/api/contact.ts`) that checks Turnstile and emails the
shop through Resend.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Live-reloading preview at http://localhost:4321 (form shows but can't send) |
| `npm run build` | Production build into `dist/` (needs `PUBLIC_TURNSTILE_SITE_KEY`, see below) |
| `npm run preview:cf` | Serve `dist/` with the real Cloudflare runtime at http://localhost:8788, form included |
| `npm run check` | Type-check everything |

`npm run preview:cf` reads secrets from `.dev.vars` (gitignored). It ships with Cloudflare's
always-pass Turnstile test secret and a fake Resend key, so a test submission ends with
"couldn't be sent". Put a real Resend key there to send real email. Build first with
`PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build`.

## Editing content

- **Business facts** (phone, email, address, hours, labor rate, partners, analytics IDs):
  `src/data/site.json`. The header, footer, contact page, and Google business data read from here.
- **Page and service text:** Markdown in `src/content/pages/` and `src/content/services/`.
  A new file in `services/` becomes a new service page and card automatically (needs `title`,
  `heading`, `order`).
- **Replacing a stand-in service photo:** put the photo in `src/assets/images/photos/`, point the
  service's `image:` at it, update `imageAlt:`, and delete `imagePlaceholder: true`. Any size or
  format is fine; the build resizes and compresses it.
- `/styleguide/` shows every color and component. It is not linked, indexed, or tracked.

## One-time Cloudflare setup

DNS for todomotoboulder.com is already on Cloudflare. Shop email is hosted at **MXroute**;
nothing below changes the root MX records.

1. **Turnstile** (Cloudflare dashboard > Turnstile > Add widget): hostnames
   `todomotoboulder.com` and `todomoto-site.pages.dev`. Keep the site key and secret key.
2. **Resend** (resend.com, free tier): add domain `todomotoboulder.com` and create the DNS records it
   lists in Cloudflare DNS (a DKIM TXT on `resend._domainkey` and MX + TXT on the `send`
   subdomain). Wait for "Verified", then create an API key with sending access.
3. **Pages project** (Workers & Pages > Create > Pages > connect the Git repo):
   - Build command `npm run build`, output directory `dist` (Node version comes from `.nvmrc`)
   - Variables and Secrets:
     - `PUBLIC_TURNSTILE_SITE_KEY` = Turnstile site key (plain text; used at build time)
     - `TURNSTILE_SECRET_KEY` = Turnstile secret key (secret)
     - `RESEND_API_KEY` = Resend API key (secret)

   Without Git: `npx wrangler login`, then build with the real site key and run
   `npx wrangler pages deploy dist`.
4. Test the form on the `*.pages.dev` preview URL and confirm the email reaches
   shop@todomotoboulder.com.

## Launch

1. Pages project > Custom domains > add `todomotoboulder.com` and `www.todomotoboulder.com`.
   Cloudflare replaces the DNS records pointing at the WordPress host; the new site is live
   within minutes.
2. Leave the WordPress hosting running for 30 days as a fallback, then cancel it.
3. Google Search Console: submit `https://todomotoboulder.com/sitemap-index.xml`.
4. Watch Search Console for 404s for a few weeks. Every WordPress page URL is unchanged, and
   `public/_redirects` covers the WordPress-only URLs.

## Email SPF fix (independent of the site)

The domain has **two** SPF TXT records (`include:_spf.google.com` and `include:mxroute.com`).
Only one is allowed, so SPF currently fails for mail sent as @todomotoboulder.com. Replace both
with a single record:

```
v=spf1 include:mxroute.com include:_spf.google.com ~all
```

Drop `include:_spf.google.com` if nothing sends through Google.

## Project layout

```
src/content/        page + service Markdown (edit copy here)
src/data/site.json  business facts
src/components/     Astro components; ContactForm.tsx is the only React island
src/lib/            site helpers, shared contact-form validation
functions/api/      Cloudflare Pages Function for the form
public/             _redirects, _headers, robots.txt, favicons
scripts/            import-wp.mjs (one-time WordPress import), make-favicons.mjs
_archive/           raw WordPress export, HTML, and original uploads
docs/               audit, URL inventory, before/after screenshots
```
