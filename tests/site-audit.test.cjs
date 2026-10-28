const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'tests' || entry.name === '.git' || entry.name === '.vercel') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function htmlFiles() { return walk(ROOT).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}tests${path.sep}`)); }
function read(relative) { return fs.readFileSync(path.join(ROOT, relative), 'utf8'); }
function stripTags(s) { return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, ' ').replace(/\s+/g, ' ').trim(); }

test('all public HTML pages have unique titles, descriptions, canonical URLs and one H1', () => {
  const pages = htmlFiles();
  assert.equal(pages.length, 20, 'expected 19 indexable pages plus 404.html');
  const titles = new Map(); const canonicals = new Map();
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
    const h1s = html.match(/<h1\b/gi) || [];
    assert.ok(title, `${file}: title missing`);
    assert.ok(description, `${file}: meta description missing`);
    assert.equal(h1s.length, 1, `${file}: expected exactly one H1`);
    if (file.endsWith('404.html')) continue;
    assert.ok(!titles.has(title), `duplicate title ${title}: ${file} and ${titles.get(title)}`);
    titles.set(title, file);
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    assert.ok(canonical, `${file}: canonical missing`);
    assert.ok(!canonicals.has(canonical), `duplicate canonical ${canonical}`);
    canonicals.set(canonical, file);
  }
  assert.equal(canonicals.size, 19);
});

test('all internal href and src paths resolve to a file in the static site', () => {
  const pages = htmlFiles();
  const broken = [];
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)="(\/[^"#?]*)"/g)) {
      let urlPath = match[1];
      if (urlPath === '/') urlPath = '/index.html';
      let local = path.join(ROOT, urlPath.replace(/^\//, ''));
      if (urlPath.endsWith('/')) local = path.join(local, 'index.html');
      if (fs.existsSync(local) && fs.statSync(local).isFile()) continue;
      broken.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
    }
  }
  assert.deepEqual(broken, [], `unresolved internal URLs: ${broken.join('; ')}`);
});

test('structured data blocks parse as JSON and sitemap points to existing pages', () => {
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `${file}: invalid structured data`);
    }
  }
  const xml = read('sitemap.xml');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(urls.length, 19);
  assert.equal(new Set(urls).size, 19);
  for (const url of urls) {
    const pathname = new URL(url).pathname;
    const local = path.join(ROOT, pathname.replace(/^\//, ''), 'index.html');
    const alternative = path.join(ROOT, pathname.replace(/^\//, ''));
    assert.ok(fs.existsSync(local) || fs.existsSync(alternative), `sitemap target missing: ${url}`);
  }
});

test('eight source-linked guides contain useful content and route readers to a tool', () => {
  const articles = htmlFiles().filter(file => file.includes(`${path.sep}blog${path.sep}`) && !file.endsWith(`${path.sep}blog${path.sep}index.html`));
  assert.equal(articles.length, 8);
  for (const file of articles) {
    const html = fs.readFileSync(file, 'utf8');
    const text = stripTags(html);
    assert.ok(text.split(' ').length >= 600, `${file}: article body looks too short`);
    assert.match(html, /article-sources[\s\S]*?https:\/\//, `${file}: source links missing`);
    assert.match(html, /href="\/(?:jwt-tools|css-clamp-generator)\/"/, `${file}: no link back to a tool`);
  }
});

test('reference constraints: no star glyphs and no required external UI framework', () => {
  for (const file of [...htmlFiles(), ...walk(path.join(ROOT, 'assets')).filter(f => /\.(css|js)$/.test(f))]) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /[★☆⭐✨]/u, `${file}: prohibited decorative star glyph`);
  }
  const html = htmlFiles().map(f => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(html, /(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com)/i);
});
