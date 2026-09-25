#!/usr/bin/env node
// WordPress (Elementor) -> Astro content import for todomotoboulder.com.
// Zero dependencies. Copies images to src/assets/images/** and writes one Markdown file
// per WP page. The Markdown has since been rewritten by hand, so existing files are
// skipped unless --overwrite is passed.
//
//   node scripts/import-wp.mjs               convert from _archive/ snapshot
//   node scripts/import-wp.mjs --fetch       refresh _archive/ from the live site first
//   node scripts/import-wp.mjs --overwrite   replace existing Markdown (loses hand edits)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://todomotoboulder.com';
const ARCHIVE = path.join(ROOT, '_archive');
const SERVICES_PARENT_ID = 79;

// Old upload path -> [new asset path (relative to src/assets/images), alt text].
// WordPress had no alt text on any image, so it is written here.
// Anything not listed stays in _archive/media only.
const IMAGE_MAP = {
  '2026/02/TodoMoto03-03-scaled.png': ['brand/logo-mark-black.png', 'Todo Moto logo'],
  '2026/02/cropped-TodoMoto03-03-scaled-1.png': ['brand/logo-mark-black-512.png', 'Todo Moto logo'],
  '2026/04/TodoMoto03-06-scaled.png': ['brand/logo-mark-red.png', 'Todo Moto logo'],
  '2026/02/TodoMoto03-01-scaled.png': ['brand/logo-wordmark-black.png', 'Todo Moto'],
  '2026/02/TodoMoto03-04-scaled.png': ['brand/logo-wordmark-red.png', 'Todo Moto'],
  '2026/02/000217650018-scaled.jpg': ['photos/rider-night-bw.jpg', 'Rider on a motorcycle at night, in black and white'],
  '2026/02/20241028-DSC01047.jpg': ['photos/supermoto-cornering.jpg', 'Supermoto rider leaning hard into a corner'],
  '2026/02/20260120-DSC07050.jpg': ['photos/mechanic-in-shop.jpg', 'Mechanic working on a motorcycle in the Todo Moto shop'],
  '2026/02/DSC7423-scaled.jpg': ['photos/detail-drivetrain.jpg', 'Close-up of a motorcycle drivetrain'],
  '2026/02/DSC7650-scaled.jpg': ['photos/detail-rear-tire.jpg', 'Rear tire and tail of a motorcycle'],
  '2026/02/unnamed.jpg': ['photos/adventure-bike-snow.jpg', 'Adventure motorcycle with auxiliary lights parked in the snow'],
  '2026/03/68014914244__D670CE57-3370-4153-B069-25F3EBEA3A63-scaled.jpg': ['photos/engine-case-teardown.jpg', 'Motorcycle engine cases split open on a workbench'],
  // AI-generated stand-ins for service pages; to be replaced with real shop photos.
  '2026/03/Gemini_Generated_Image_p1gvznp1gvznp1gv-scaled.png': ['placeholders/scooter-service.png', 'Mechanic servicing a Vespa scooter'],
  '2026/03/Gemini_Generated_Image_cgbz3acgbz3acgbz-scaled.png': ['placeholders/inspection.png', 'Mechanic inspecting an adventure motorcycle'],
  '2026/03/Gemini_Generated_Image_4noksb4noksb4nok-scaled.png': ['placeholders/diagnosis.png', 'Mechanic diagnosing a motorcycle at a shop computer'],
  '2026/03/Gemini_Generated_Image_89tw7589tw7589tw-scaled.png': ['placeholders/oil-change.png', 'Mechanic pouring oil into a motorcycle engine'],
  '2026/04/NEW_Vikingbags_logo_16_Version.avif': ['partners/viking-bags.avif', 'Viking Bags logo'],
  '2026/04/RJ_BlackBlue-01-e1629307274367.jpg': ['partners/rider-justice.jpg', 'Rider Justice logo'],
  '2026/04/RJ-02-Logo-WhiteGold.webp': ['partners/rider-justice-white.webp', 'Rider Justice logo'],
  '2026/04/Roost-Concepts-Logo-black-2C-Tight.png': ['partners/roost-concepts-black.png', 'Roost Concepts logo'],
  '2026/04/Roost-Concepts-Logo-White-2C-Tight.avif': ['partners/roost-concepts-white.avif', 'Roost Concepts logo'],
  '2026/04/LOGO-copy-solo-PhotoRoom.png': ['partners/wilson-fabrication.png', 'Wilson Fabrication logo'],
};

const UA = { 'User-Agent': 'todomoto-import/1.0' };

async function refreshArchive() {
  const get = async (p) => {
    const r = await fetch(SITE + p, { headers: UA });
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
    return r.json();
  };
  const pages = await get('/wp-json/wp/v2/pages?per_page=100');
  const media = await get('/wp-json/wp/v2/media?per_page=100');
  fs.mkdirSync(path.join(ARCHIVE, 'wp-json'), { recursive: true });
  fs.writeFileSync(path.join(ARCHIVE, 'wp-json/pages.json'), JSON.stringify(pages, null, 2));
  fs.writeFileSync(path.join(ARCHIVE, 'wp-json/media.json'), JSON.stringify(media, null, 2));
  fs.mkdirSync(path.join(ARCHIVE, 'media'), { recursive: true });
  for (const m of media) {
    const rel = m.source_url.split('/uploads/')[1];
    const r = await fetch(m.source_url, { headers: UA });
    if (!r.ok) { console.warn(`media ${rel}: HTTP ${r.status}`); continue; }
    fs.writeFileSync(path.join(ARCHIVE, 'media', rel.replaceAll('/', '_')), Buffer.from(await r.arrayBuffer()));
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);

const localHref = (href) => href.startsWith(SITE) ? (href.slice(SITE.length) || '/') : href;
const uploadKey = (src) => src.split('/uploads/')[1]?.replace(/-\d+x\d+(?=\.\w+$)/, '');

function imagePath(src, fromDir) {
  const mapped = IMAGE_MAP[uploadKey(src)];
  if (!mapped) { console.warn(`unmapped image, keeping remote URL: ${src}`); return src; }
  return path.posix.relative(fromDir, `src/assets/images/${mapped[0]}`);
}

const imageAlt = (src) => IMAGE_MAP[uploadKey(src)]?.[1] ?? '';

// Inline HTML -> Markdown. Only the tags Elementor text widgets actually emit.
function inline(html) {
  return decode(html
    .replace(/\s*\n\s*/g, ' ') // source newlines are soft wraps
    .replace(/<br\s*\/?>/gi, '\u0000')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '_$2_')
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => `[${t.replace(/<[^>]+>/g, '').trim()}](${localHref(decode(h))})`)
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\u0000 */g, '\\\n') // hard line break
    .trim();
}

const plain = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

// Split Elementor HTML into widgets in document order.
function widgets(html) {
  const marks = [...html.matchAll(/data-widget_type="([\w-]+)\.default"/g)];
  return marks.map((m, i) => ({ type: m[1], html: html.slice(m.index, marks[i + 1]?.index ?? html.length) }));
}

function parseWidget({ type, html }) {
  switch (type) {
    case 'heading': {
      const m = html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/);
      return m && { kind: 'heading', text: inline(m[2]) };
    }
    case 'text-editor': {
      // Rich-text widget: paragraphs plus occasional inline headings, in order.
      const body = html.replace(/^[^>]*>/, '');
      const parts = [...body.matchAll(/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/g)]
        .map((m) => (m[1] === 'p' ? inline(m[2]) : `## ${plain(m[2])}`));
      const list = parts.length ? parts : [inline(body)];
      return { kind: 'text', paras: list.filter(Boolean) };
    }
    case 'image': {
      const m = html.match(/<img\b[^>]*src="([^"]+)"[^>]*>/);
      const alt = html.match(/<img\b[^>]*alt="([^"]*)"/)?.[1] ?? '';
      return m && { kind: 'image', src: m[1], alt: decode(alt) };
    }
    case 'image-box': {
      const src = html.match(/<img\b[^>]*src="([^"]+)"/)?.[1];
      const href = html.match(/<a\b[^>]*href="([^"]+)"/)?.[1];
      const title = html.match(/elementor-image-box-title[^>]*>([\s\S]*?)<\/h\d>/)?.[1];
      return { kind: 'imagebox', src, href: href && decode(href), title: title && plain(title) };
    }
    case 'button': {
      const href = html.match(/<a\b[^>]*href="([^"]+)"/)?.[1];
      const text = html.match(/elementor-button-text">([\s\S]*?)<\/span>/)?.[1];
      return href && text && { kind: 'button', href: localHref(decode(href)), text: inline(text) };
    }
    case 'form': {
      const fields = [...html.matchAll(/name="form_fields\[([^\]]+)\]"/g)].map((m) => m[1]);
      return { kind: 'form', fields };
    }
    case 'google_maps': {
      const q = html.match(/maps\?q=([^&"]+)/)?.[1];
      return q && { kind: 'map', query: decodeURIComponent(decode(q)) };
    }
    case 'icon-box': {
      const title = html.match(/elementor-icon-box-title[^>]*>([\s\S]*?)<\/h\d>/)?.[1];
      const desc = html.match(/elementor-icon-box-description[^>]*>([\s\S]*?)<\/p>/)?.[1];
      const text = [title, desc].filter(Boolean).map(inline).join(' ');
      return text && { kind: 'text', paras: [text] };
    }
    default:
      return null; // spacer, divider: layout only
  }
}

const yaml = (obj) => '---\n' + Object.entries(obj)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}: ${Array.isArray(v) ? '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']' : JSON.stringify(v)}`)
  .join('\n') + '\n---\n';

function legacyPath(link) { return localHref(link); }

function renderPage(page, outDir) {
  const blocks = widgets(page.content.rendered).map(parseWidget).filter(Boolean);
  const firstHeading = blocks.find((b) => b.kind === 'heading');
  const out = [];
  const extra = {};
  for (const b of blocks) {
    if (b === firstHeading) continue;
    if (b.kind === 'heading') out.push(`## ${b.text}`);
    else if (b.kind === 'text') out.push(...b.paras);
    else if (b.kind === 'image') out.push(`![${b.alt || imageAlt(b.src)}](${imagePath(b.src, outDir)})`);
    else if (b.kind === 'imagebox') out.push(`- [${b.title}](${b.href})${b.src ? ` ![${b.title} logo](${imagePath(b.src, outDir)})` : ''}`);
    else if (b.kind === 'button') out.push(`[${b.text}](${b.href})`);
    else if (b.kind === 'form') extra.legacyFormFields = b.fields;
    else if (b.kind === 'map') extra.legacyMapQuery = b.query;
  }
  // Consecutive list items must not be separated by blank lines.
  const body = out.join('\n\n').replace(/(^- .*)\n\n(?=- )/gm, '$1\n') + '\n';
  return { heading: firstHeading?.text, body, extra, blocks };
}

async function main() {
  if (process.argv.includes('--fetch')) await refreshArchive();
  const pages = JSON.parse(fs.readFileSync(path.join(ARCHIVE, 'wp-json/pages.json'), 'utf8'));
  const media = JSON.parse(fs.readFileSync(path.join(ARCHIVE, 'wp-json/media.json'), 'utf8'));

  // Featured image; fall back to an image uploaded to the page (Diagnosis has one
  // attached but never set as featured). Unmapped uploads (HEIC) are skipped.
  const featuredImage = (page) => {
    const m = media.find((x) => x.id === page.featured_media)
      ?? media.find((x) => x.post === page.id && x.mime_type.startsWith('image/'));
    return m && IMAGE_MAP[uploadKey(m.source_url)] ? m.source_url : undefined;
  };

  // Service order = order of the tiles on the /services/ page.
  const servicesIndex = pages.find((p) => p.id === SERVICES_PARENT_ID);
  const serviceOrder = widgets(servicesIndex.content.rendered).map(parseWidget)
    .filter((b) => b?.kind === 'button' && b.href.startsWith('/services/'))
    .map((b) => b.href.split('/').filter(Boolean).pop());

  for (const dir of ['src/content/services', 'src/content/pages']) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }

  for (const page of pages) {
    const isService = page.parent === SERVICES_PARENT_ID;
    const outDir = isService ? 'src/content/services' : 'src/content/pages';
    const { heading, body, extra, blocks } = renderPage(page, outDir);
    const fm = {
      title: decode(page.title.rendered).trim(),
      heading,
      legacyUrl: legacyPath(page.link),
      wpId: page.id,
      updated: page.modified.slice(0, 10),
      ...extra,
    };
    const img = featuredImage(page);
    if (img) {
      fm.image = imagePath(img, outDir);
      fm.imageAlt = imageAlt(img);
    }
    let text = body;
    if (isService) {
      // Tile buttons at the bottom of each service page are cross-links; the new
      // layout generates them from the collection, so keep only prose.
      fm.order = serviceOrder.indexOf(page.slug) + 1 || undefined;
      // Every service-page photo is a stand-in until the shop supplies real ones.
      if (img) fm.imagePlaceholder = true;
      text = blocks.filter((b) => b.kind === 'text').flatMap((b) => b.paras).join('\n\n') + '\n';
    }
    const file = path.join(ROOT, outDir, `${page.slug}.md`);
    if (fs.existsSync(file) && !process.argv.includes('--overwrite')) {
      console.log(`kept ${path.relative(ROOT, file)} (exists; pass --overwrite to replace)`);
      continue;
    }
    fs.writeFileSync(file, yaml(fm) + '\n' + text);
    console.log(`wrote ${path.relative(ROOT, file)}`);
  }

  for (const [src, [dest]] of Object.entries(IMAGE_MAP)) {
    const from = path.join(ARCHIVE, 'media', src.replaceAll('/', '_'));
    const to = path.join(ROOT, 'src/assets/images', dest);
    if (!fs.existsSync(from)) { console.warn(`missing archived media: ${src}`); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  console.log(`copied ${Object.keys(IMAGE_MAP).length} images to src/assets/images/`);
}

await main();
