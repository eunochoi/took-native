const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const tokens = require('../src/theme/tokens.json');
const out = path.resolve(__dirname, '../assets/ui');

(async () => {
  const source = fs.readFileSync(path.join(out, 'wordmark.png')).toString('base64');
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      [
        chromium.executablePath(),
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      ].find((filename) => fs.existsSync(filename)),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const data = await page.evaluate(
      async ({ source, foreground }) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const color = [1, 3, 5].map((start) => parseInt(foreground.slice(start, start + 2), 16));
        // Keep the entire colored paw area, including its neutral antialiased edges.
        let pawLeft = canvas.width;
        let pawRight = 0;
        for (let i = 0; i < pixels.data.length; i += 4) {
          if (pixels.data[i + 3] > 20 && pixels.data[i] !== pixels.data[i + 2]) {
            const x = (i / 4) % canvas.width;
            pawLeft = Math.min(pawLeft, x);
            pawRight = Math.max(pawRight, x);
          }
        }
        for (let i = 0; i < pixels.data.length; i += 4) {
          const x = (i / 4) % canvas.width;
          if (
            (x < pawLeft - 2 || x > pawRight + 2) &&
            pixels.data[i + 3] &&
            pixels.data[i] === pixels.data[i + 1] &&
            pixels.data[i] === pixels.data[i + 2]
          ) {
            pixels.data.set(color, i);
          }
        }
        context.putImageData(pixels, 0, 0);
        return canvas.toDataURL('image/png').split(',')[1];
      },
      { source, foreground: tokens.colorValues[tokens.colors.dark.textPrimary] },
    );
    fs.writeFileSync(path.join(out, 'wordmark-dark.png'), Buffer.from(data, 'base64'));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
