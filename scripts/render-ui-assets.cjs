const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const webFonts = path.resolve(root, '../took/next/public/fonts');
const out = path.join(root, 'assets/ui');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const font = fs.readFileSync(path.join(webFonts, 'Fredoka[wdth,wght].ttf')).toString('base64');
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 800, height: 400 },
    deviceScaleFactor: 4,
  });
  await page.setContent(
    `<style>@font-face{font-family:Fredoka;src:url(data:font/ttf;base64,${font});font-weight:300 700;font-stretch:75% 125%;}html{font-size:15px}body{margin:0;background:transparent}#wordmark{display:inline-flex;align-items:baseline;gap:.125rem;font-size:48px;color:#585858}#letters{font-family:Fredoka;font-weight:550;font-stretch:95%;line-height:1}#dot{height:.23em;width:.23em;border-radius:50%;background:#8CADE2}</style><span id="wordmark"><span id="letters">to:ok</span><span id="dot"></span></span>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.locator('#wordmark').boundingBox();
  await page.locator('#wordmark').screenshot({ path: out + '/wordmark.png', omitBackground: true });
  fs.writeFileSync(
    out + '/wordmark.json',
    JSON.stringify({ width: bounds.width, height: bounds.height }, null, 2) + '\n',
  );
  fs.copyFileSync(path.join(webFonts, 'Fredoka-OFL.txt'), out + '/Fredoka-OFL.txt');
  console.log(bounds);
  await browser.close();
})();
