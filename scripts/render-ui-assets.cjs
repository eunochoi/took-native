const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const tokens = require('../src/theme/tokens.json');
const out = path.resolve(__dirname, '../assets/ui');

(async () => {
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
    const images = await page.evaluate(
      async ({ wordmark, character, foreground }) => {
        const load = async (source) => {
          const image = new Image();
          image.src = 'data:image/png;base64,' + source;
          await image.decode();
          return image;
        };
        const canvas = (width, height) => {
          const result = document.createElement('canvas');
          result.width = width;
          result.height = height;
          return result;
        };
        const trim = (image) => {
          const source = canvas(image.width, image.height);
          const context = source.getContext('2d');
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, source.width, source.height);
          let left = source.width;
          let top = source.height;
          let right = -1;
          let bottom = -1;
          for (let i = 0; i < pixels.data.length; i += 4) {
            // Remove almost invisible alpha noise without leaving empty outer margins.
            if (pixels.data[i + 3] <= 8) {
              pixels.data[i + 3] = 0;
              continue;
            }
            const x = (i / 4) % source.width;
            const y = Math.floor(i / 4 / source.width);
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
          if (right < left) throw new Error('UI source image is empty.');
          context.putImageData(pixels, 0, 0);
          const result = canvas(right - left + 1, bottom - top + 1);
          result.getContext('2d').drawImage(source, -left, -top);
          return result;
        };
        const logo = trim(await load(wordmark));
        const dark = canvas(logo.width, logo.height);
        const darkContext = dark.getContext('2d');
        darkContext.drawImage(logo, 0, 0);
        const pixels = darkContext.getImageData(0, 0, dark.width, dark.height);
        // Detect the blue portion rather than relying on specific letter positions.
        let blueLeft = dark.width;
        for (let i = 0; i < pixels.data.length; i += 4) {
          const [r, g, b, a] = pixels.data.subarray(i, i + 4);
          if (a > 128 && b - r > 35 && b - g > 15) {
            blueLeft = Math.min(blueLeft, (i / 4) % dark.width);
          }
        }
        if (blueLeft === dark.width) throw new Error('BlooLog blue lettering was not found.');
        const color = [1, 3, 5].map((start) => parseInt(foreground.slice(start, start + 2), 16));
        for (let i = 0; i < pixels.data.length; i += 4) {
          const x = (i / 4) % dark.width;
          const [r, g, b, a] = pixels.data.subarray(i, i + 4);
          // Keep the blue log. and its face colors unchanged.
          if (x < blueLeft && a && Math.max(r, g, b) - Math.min(r, g, b) <= 24) {
            pixels.data.set(color, i);
          }
        }
        darkContext.putImageData(pixels, 0, 0);
        const cat = trim(await load(character));
        const logoHeight = Math.round((cat.width * logo.height) / logo.width);
        const gap = Math.round(cat.height * 0.14);
        const composition = canvas(cat.width, cat.height + gap + logoHeight);
        const compositionContext = composition.getContext('2d');
        compositionContext.drawImage(cat, 0, 0);
        compositionContext.drawImage(logo, 0, cat.height + gap, cat.width, logoHeight);
        const encode = (image) => image.toDataURL('image/png').split(',')[1];
        const results = {
          'wordmark.png': encode(logo),
          'wordmark-dark.png': encode(dark),
          'splash-source.png': encode(composition),
        };
        const data = compositionContext.getImageData(
          0,
          0,
          composition.width,
          composition.height,
        ).data;
        const centerX = (composition.width - 1) / 2;
        const centerY = (composition.height - 1) / 2;
        let radius = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (!data[i + 3]) continue;
          const x = (i / 4) % composition.width;
          const y = Math.floor(i / 4 / composition.width);
          radius = Math.max(radius, Math.hypot(x - centerX, y - centerY));
        }
        for (const [filename, maxSize, safeRadius] of [
          ['splash.png', 864, Infinity],
          // At imageWidth 228, radius 400 occupies 91.2dp of Android's 96dp safe radius.
          ['splash-android.png', 720, 400],
        ]) {
          const output = canvas(1000, 1000);
          const context = output.getContext('2d');
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, output.width, output.height);
          const scale = Math.min(
            maxSize / composition.width,
            maxSize / composition.height,
            safeRadius / radius,
          );
          const width = composition.width * scale;
          const height = composition.height * scale;
          context.drawImage(
            composition,
            (output.width - width) / 2,
            (output.height - height) / 2,
            width,
            height,
          );
          results[filename] = encode(output);
        }
        return results;
      },
      {
        wordmark: fs.readFileSync(path.join(out, 'wordmark-source.png')).toString('base64'),
        character: fs.readFileSync(path.join(out, 'splash-character.png')).toString('base64'),
        foreground: tokens.colorValues[tokens.colors.dark.textPrimary],
      },
    );
    for (const [filename, data] of Object.entries(images)) {
      fs.writeFileSync(path.join(out, filename), Buffer.from(data, 'base64'));
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
