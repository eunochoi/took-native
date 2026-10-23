const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const tokens = require('../src/theme/tokens.json');
const out = path.resolve(__dirname, '../assets/ui');

(async () => {
  const source = fs.readFileSync(path.join(out, 'wordmark-source.png')).toString('base64');
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
      async ({ source, tokens }) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const original = context.getImageData(0, 0, canvas.width, canvas.height);
        // Source artwork columns: T, stacked circles, K. Move whole elements only.
        const circleStart = 704;
        const kStart = 1060;
        let leftGap = Infinity;
        let rightGap = Infinity;
        for (let y = 0; y < original.height; y++) {
          let tRight = -1;
          let circleLeft = Infinity;
          let circleRight = -1;
          let kLeft = Infinity;
          for (let x = 0; x < original.width; x++) {
            if (original.data[(y * original.width + x) * 4 + 3] <= 200) continue;
            if (x < circleStart) tRight = x;
            else if (x < kStart) {
              circleLeft = Math.min(circleLeft, x);
              circleRight = x;
            } else kLeft = Math.min(kLeft, x);
          }
          if (tRight >= 0 && circleRight >= 0) {
            leftGap = Math.min(leftGap, circleLeft - tRight - 1);
          }
          if (circleRight >= 0 && Number.isFinite(kLeft)) {
            rightGap = Math.min(rightGap, kLeft - circleRight - 1);
          }
        }
        if (!Number.isFinite(leftGap + rightGap) || leftGap <= 0 || rightGap <= 0) {
          throw new Error('Cannot measure the gaps between wordmark elements.');
        }
        canvas.width = original.width + leftGap + rightGap;
        const accentPixels = [];
        let brightness = 0;
        let weight = 0;
        for (let i = 0; i < original.data.length; i += 4) {
          const [r, g, b, alpha] = original.data.subarray(i, i + 4);
          if (alpha && b - r > 15) {
            accentPixels.push(i);
            brightness += ((r + g + b) / 3) * alpha;
            weight += alpha;
          }
        }
        if (!weight) throw new Error('No blue accent pixels found in the source wordmark.');
        const mean = brightness / weight;
        const accentMask = new Set(accentPixels);
        const images = {};
        for (const [name, palette] of Object.entries(tokens.colors.accents)) {
          const hex = tokens.colorValues[palette.accent];
          const color = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
          for (const mode of ['light', 'dark']) {
            const result = new ImageData(canvas.width, canvas.height);
            for (let i = 0; i < original.data.length; i += 4) {
              if (!original.data[i + 3]) continue;
              const x = (i / 4) % original.width;
              const y = Math.floor(i / 4 / original.width);
              const shift = x < circleStart ? 0 : x < kStart ? leftGap : leftGap + rightGap;
              const destination = (y * canvas.width + x + shift) * 4;
              const isAccent = accentMask.has(i);
              const tone =
                (original.data[i] + original.data[i + 1] + original.data[i + 2]) / 3 - mean;
              for (let channel = 0; channel < 3; channel++) {
                result.data[destination + channel] = isAccent
                  ? color[channel] + tone
                  : mode === 'dark'
                    ? 255
                    : original.data[i + channel];
              }
              result.data[destination + 3] = original.data[i + 3];
            }
            context.putImageData(result, 0, 0);
            const filename =
              mode === 'dark'
                ? `wordmark-${name}-dark.png`
                : name === 'blue'
                  ? 'wordmark.png'
                  : `wordmark-${name}.png`;
            images[filename] = canvas.toDataURL('image/png').split(',')[1];
          }
        }
        return images;
      },
      { source, tokens },
    );
    for (const [filename, data] of Object.entries(images)) {
      fs.writeFileSync(path.join(out, filename), Buffer.from(data, 'base64'));
      console.log(filename);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
