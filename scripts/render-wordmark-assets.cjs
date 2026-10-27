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
      async ({ wordmark, foreground, palettes }) => {
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
        const encode = (image) => image.toDataURL('image/png').split(',')[1];
        const results = {};
        // Derive one face mask from the approved blue source, retaining its antialiasing.
        const original = logo.getContext('2d').getImageData(0, 0, logo.width, logo.height);
        const samples = { body: [0, 0, 0, 0], face: [0, 0, 0, 0] };
        for (let i = 0; i < original.data.length; i += 4) {
          const x = (i / 4) % logo.width;
          const [r, g, b, a] = original.data.subarray(i, i + 4);
          if (x < blueLeft || a < 240) continue;
          const sample = (r + g + b) / 3 < 135 ? samples.face : samples.body;
          sample[0] += r;
          sample[1] += g;
          sample[2] += b;
          sample[3]++;
        }
        if (!samples.body[3] || !samples.face[3]) {
          throw new Error('BlooLog lettering and face could not be separated.');
        }
        const body = samples.body.slice(0, 3).map((value) => value / samples.body[3]);
        const face = samples.face.slice(0, 3).map((value) => value / samples.face[3]);
        const delta = face.map((value, index) => value - body[index]);
        const distance = delta.reduce((sum, value) => sum + value * value, 0);
        const faceMask = new Float32Array(logo.width * logo.height);
        for (let i = 0; i < original.data.length; i += 4) {
          if (!original.data[i + 3] || (i / 4) % logo.width < blueLeft) continue;
          const fraction =
            delta.reduce(
              (sum, value, index) => sum + (original.data[i + index] - body[index]) * value,
              0,
            ) / distance;
          faceMask[i / 4] = fraction < 0.06 ? 0 : fraction > 0.94 ? 1 : fraction;
        }
        for (const [accent, modes] of Object.entries(palettes)) {
          for (const [mode, palette] of Object.entries(modes)) {
            const themed = canvas(logo.width, logo.height);
            const context = themed.getContext('2d');
            context.drawImage(mode === 'dark' ? dark : logo, 0, 0);
            const data = context.getImageData(0, 0, logo.width, logo.height);
            const accentColor = [1, 3, 5].map((start) =>
              parseInt(palette.accent.slice(start, start + 2), 16),
            );
            // Keep the accent-deep hue while giving the small face enough contrast.
            const faceColor = [1, 3, 5].map((start) =>
              Math.round(parseInt(palette.accentDeep.slice(start, start + 2), 16) * 0.7),
            );
            for (let i = 0; i < data.data.length; i += 4) {
              if (!data.data[i + 3] || (i / 4) % logo.width < blueLeft) continue;
              const fraction = faceMask[i / 4];
              for (let channel = 0; channel < 3; channel++) {
                data.data[i + channel] = Math.round(
                  accentColor[channel] * (1 - fraction) + faceColor[channel] * fraction,
                );
              }
            }
            context.putImageData(data, 0, 0);
            results[`wordmark-${accent}-${mode}.png`] = encode(themed);
          }
        }
        return results;
      },
      {
        wordmark: fs.readFileSync(path.join(out, 'wordmark-source.png')).toString('base64'),
        foreground: tokens.colorValues[tokens.colors.dark.textPrimary],
        palettes: Object.fromEntries(
          Object.entries(tokens.colors.accents).map(([name, palette]) => [
            name,
            Object.fromEntries(
              ['light', 'dark'].map((mode) => {
                const references = {
                  ...palette,
                  ...(mode === 'dark' ? tokens.colors.accentsDark[name] : {}),
                };
                return [
                  mode,
                  {
                    accent: tokens.colorValues[references.accent],
                    accentDeep: tokens.colorValues[references.accentDeep],
                  },
                ];
              }),
            ),
          ]),
        ),
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
