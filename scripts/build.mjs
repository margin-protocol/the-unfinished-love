// 《愛的未完成式》官網建置腳本
// 零依賴：只需要 Node 18+。執行 `node scripts/build.mjs`，輸出到 dist/。
//
// 頁面內容放在 src/pages/*.html，開頭用 front matter 標記頁面資訊；
// 共用版型在 src/layout.html，共用片段在 src/partials/。
// 所有站內連結都使用相對路徑，因此部署到 GitHub Pages 的子路徑
// （/the-unfinished-love/）或任何資料夾都能正常運作。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));

// 八頁的順序就是「翻頁」順序
export const PAGES = [
  { slug: 'index', label: '首頁' },
  { slug: 'story', label: '故事起點' },
  { slug: 'archive', label: '婚姻檔案' },
  { slug: 'possibilities', label: '關係的可能' },
  { slug: 'guide', label: '使用指南' },
  { slug: 'registration', label: '人物登記' },
  { slug: 'preview', label: '試閱檔案' },
  { slug: 'begin', label: '開始故事' },
];

const NAV = [
  { slug: 'index', label: '首頁' },
  { slug: 'story', label: '故事' },
  { slug: 'archive', label: '檔案' },
  { slug: 'preview', label: '試閱' },
  { slug: 'begin', label: '開始故事', cta: true },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (slug) => (slug === 'index' ? './' : `./${slug}.html`);
const read = (p) => readFileSync(join(src, p), 'utf8');

function parse(file) {
  const raw = read(join('pages', file));
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file} 缺少 front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

// 外部連結：網址未設定時輸出「連結待設定」狀態，不偽造網址
function externalLink(key, label, cls = '') {
  const url = config[key];
  if (url) {
    return `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}<span class="visually-hidden">（另開新視窗）</span></a>`;
  }
  return `<span class="${cls} is-pending" aria-disabled="true">${label}<small class="pending-note">連結待設定</small></span>`;
}

function render(tpl, ctx) {
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => render(read(join('partials', `${name}.html`)), ctx))
    .replace(/\{\{ext:(\w+)\|([^|}]+)(?:\|([^}]*))?\}\}/g, (_, key, label, cls) => externalLink(key, label, cls || ''))
    .replace(/\{\{href:([\w-]+)\}\}/g, (_, slug) => href(slug))
    .replace(/\{\{([\w.]+)\}\}/g, (all, key) => {
      const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
      return v == null ? '' : v;
    });
}

function navHtml(current) {
  return NAV.map(
    (n) =>
      `<li><a class="nav-link${n.cta ? ' nav-cta' : ''}" href="${href(n.slug)}"${n.slug === current ? ' aria-current="page"' : ''}>${n.label}</a></li>`,
  ).join('\n          ');
}

function indexHtml(current) {
  return PAGES.map(
    (p, i) =>
      `<li><a href="${href(p.slug)}"${p.slug === current ? ' aria-current="page"' : ''}><span class="idx-no">${String(i + 1).padStart(2, '0')}</span>${p.label}</a></li>`,
  ).join('\n            ');
}

function turnerHtml(slug) {
  const i = PAGES.findIndex((p) => p.slug === slug);
  if (i <= 0) return '';
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  const cell = (p, dir) =>
    p
      ? `<a class="turner-link turner-${dir}" href="${href(p.slug)}"><span class="turner-dir">${dir === 'prev' ? '上一頁' : '下一頁'}</span><span class="turner-title">${p.label}</span></a>`
      : '<span class="turner-link turner-empty" aria-hidden="true"></span>';
  return `<nav class="turner" aria-label="翻頁">
    ${cell(prev, 'prev')}
    <span class="turner-folio" aria-hidden="true">${String(i + 1).padStart(2, '0')} / 08</span>
    ${cell(next, 'next')}
  </nav>`;
}

// ---- build ----
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, 'assets'), join(out, 'assets'), { recursive: true });

const layout = read('layout.html');
const site = config.siteUrl.replace(/\/?$/, '/');
const files = readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html'));

for (const file of files) {
  const { meta, body } = parse(file);
  const slug = file.replace(/\.html$/, '');
  const pagePath = slug === 'index' ? '' : `${slug}.html`;
  const isListed = PAGES.some((p) => p.slug === slug);
  const ctx = {
    config,
    page: {
      ...meta,
      slug,
      fullTitle: slug === 'index' ? `${config.workTitle}｜${config.workTitleEn}` : `${meta.title}｜${config.workTitle} ${config.workTitleEn}`,
      canonical: config.siteUrl ? `<link rel="canonical" href="${site}${pagePath}">` : '',
      ogUrl: config.siteUrl ? `<meta property="og:url" content="${site}${pagePath}">` : '',
      ogImage: config.siteUrl ? `${site}${config.ogImage}` : config.ogImage,
      robots: isListed ? '' : '<meta name="robots" content="noindex">',
      // 404 頁可能出現在任意深度的網址，用 <base> 固定相對路徑的起點
      base: slug === '404' && config.siteUrl ? `<base href="${new URL(site).pathname}">` : '',
    },
    nav: navHtml(slug),
    fileIndex: indexHtml(slug),
    turner: isListed ? turnerHtml(slug) : '',
    year: new Date().getFullYear(),
  };
  ctx.content = render(body, ctx);
  writeFileSync(join(out, file), render(layout, ctx));
}

// sitemap / robots / .nojekyll
if (config.siteUrl) {
  const urls = PAGES.map((p) => `  <url><loc>${site}${p.slug === 'index' ? '' : `${p.slug}.html`}</loc></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${config.siteUrl ? `Sitemap: ${site}sitemap.xml\n` : ''}`);
writeFileSync(join(out, '.nojekyll'), '');

console.log(`✓ 已建置 ${files.length} 個頁面到 dist/`);
