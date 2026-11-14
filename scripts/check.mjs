// 驗收檢查 + 截圖（需要 Playwright；不是網站本身的依賴）
//   node scripts/check.mjs            只檢查
//   node scripts/check.mjs --shots    檢查並輸出截圖到 docs/screenshots/
// 檢查項目：JS 錯誤、各寬度是否橫向溢出、站內連結是否存在、複製功能、分頁鍵盤操作。
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BASE = '/the-unfinished-love/';
const SHOTS = process.argv.includes('--shots');
const PAGES = ['index', 'story', 'archive', 'possibilities', 'guide', 'registration', 'preview', 'begin', '404'];
const WIDTHS = [320, 360, 375, 390, 400, 768, 1280, 1440];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  let rel = decodeURIComponent(p.slice(BASE.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  try { res.writeHead(200, { 'Content-Type': TYPES[extname(rel)] || 'application/octet-stream' }); res.end(await readFile(join(dist, rel))); }
  catch { res.writeHead(404); res.end('missing'); }
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined });
const problems = [];
const url = (slug) => `${origin}${BASE}${slug === 'index' ? '' : slug + '.html'}`;

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  // 外部字體在離線測試時不載入
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${w}] JS 錯誤：${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) problems.push(`[${w}] console：${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) problems.push(`[${w}] ${r.status()} ${r.url()}`); });
  for (const slug of PAGES) {
    await page.goto(url(slug), { waitUntil: 'load' });
    const over = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > docW + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.tablist, .visually-hidden, .skip-link, pre')) bad.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
      });
      return { scroll: document.documentElement.scrollWidth > docW, bad: bad.slice(0, 5) };
    });
    if (over.scroll || over.bad.length) problems.push(`[${w}] ${slug} 橫向溢出：${over.bad.join(', ')}`);
    if (SHOTS && (w === 390 || w === 1440) && slug !== '404') {
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
      await page.waitForTimeout(400);
      await mkdir(join(root, 'docs/screenshots'), { recursive: true });
      const n = String(PAGES.indexOf(slug) + 1).padStart(2, '0');
      await page.screenshot({ path: join(root, `docs/screenshots/${n}-${slug}-${w === 390 ? 'mobile' : 'desktop'}.jpg`), fullPage: true, type: 'jpeg', quality: 82 });
    }
  }
  await ctx.close();
}

// 功能檢查
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`JS 錯誤：${e.message}`));

  // 站內連結全部存在
  const seen = new Set();
  for (const slug of PAGES) {
    await page.goto(url(slug));
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
    for (const l of links) if (l.startsWith(origin)) seen.add(l.split('#')[0]);
  }
  for (const l of seen) {
    const r = await page.request.get(l);
    if (r.status() !== 200) problems.push(`壞連結：${l}`);
  }

  // 手機選單
  await page.goto(url('story'));
  await page.click('.nav-toggle');
  if (!(await page.isVisible('.site-nav .nav-cta'))) problems.push('手機選單無法展開');
  await page.keyboard.press('Escape');
  if (await page.isVisible('.site-nav .nav-cta')) problems.push('Esc 無法關閉手機選單');

  // 指令複製
  await page.goto(url('guide'));
  const cmds = await page.$$('[data-copy]');
  if (cmds.length !== 6) problems.push(`指令複製按鈕數量為 ${cmds.length}（應為 6）`);
  for (const b of cmds) {
    await b.click();
    const want = await b.getAttribute('data-copy');
    const got = await page.evaluate(() => navigator.clipboard.readText());
    if (got !== want) problems.push(`複製結果不符：${want} → ${got}`);
  }
  if (!(await page.textContent('.toast')).includes('已複製指令')) problems.push('缺少「已複製指令」提示');

  // 分頁鍵盤操作
  await page.goto(url('archive'));
  await page.focus('#tab-people');
  await page.keyboard.press('ArrowRight');
  if (!(await page.isVisible('#file-life'))) problems.push('分頁方向鍵無效');

  // 人物登記
  await page.goto(url('registration'));
  await page.fill('#p_name', '測試的名字很長很長很長很長很長很長很長很長很長很長很長');
  await page.fill('#s_age', '35');
  await page.fill('#m_facts', '第一行\n第二行');
  await page.click('#reg-copy');
  const reg = await page.evaluate(() => navigator.clipboard.readText());
  if (!reg.includes('姓名：測試的名字') || !reg.includes('成年年齡：35') || !reg.includes('其他公開事實：第一行 第二行') || !reg.includes('故事所在地（會影響法律程序）：')) problems.push('登記文字格式錯誤');
  if (await page.isHidden('#reg-after')) problems.push('複製後沒有顯示前往提示');
  await page.fill('#p_age', '16');
  if (!(await page.isDisabled('#reg-copy'))) problems.push('未成年年齡未阻擋複製');
  await page.click('#reg-clear');
  if ((await page.inputValue('#p_name')) === '') problems.push('清空不應一次就生效');
  await page.click('#reg-clear');
  if ((await page.inputValue('#p_name')) !== '') problems.push('清空失敗');
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  if (stored) problems.push('不應寫入瀏覽器儲存空間');
  await ctx.close();
}

// reduced motion：內容一開始就可見
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url('index'));
  const op = await page.$eval('.traits .trait', (e) => getComputedStyle(e).opacity);
  if (op !== '1') problems.push('reduced motion 下內容未立即顯示');
  await ctx.close();
}

await browser.close();
server.close();
if (problems.length) { console.log('✗ 發現問題：\n' + [...new Set(problems)].map((p) => ' - ' + p).join('\n')); process.exit(1); }
console.log(`✓ 全部通過（${PAGES.length} 頁 × ${WIDTHS.length} 種寬度＋功能檢查）${SHOTS ? '，截圖已輸出到 docs/screenshots/' : ''}`);
