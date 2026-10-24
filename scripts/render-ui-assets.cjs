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
        // The canonical source already contains the approved spacing and smile.
        const columns = [];
        for (let x = 0; x < original.width; x++) {
          let occupied = false;
          for (let y = 0; y < original.height; y++) {
            if (original.data[(y * original.width + x) * 4 + 3] <= 200) continue;
            occupied = true;
            break;
          }
          if (!occupied) continue;
          const previous = columns[columns.length - 1];
          if (previous && previous[1] === x - 1) previous[1] = x;
          else columns.push([x, x]);
        }
        if (columns.length !== 3) {
          throw new Error('Expected separate T, stacked circles and K in the source wordmark.');
        }
        const [circleLeft, circleRight] = columns[1];
        const circleCenter = Math.round((circleLeft + circleRight) / 2);
        const rows = [];
        for (let y = 0; y < original.height; y++) {
          if (original.data[(y * original.width + circleCenter) * 4 + 3] <= 200) continue;
          const previous = rows[rows.length - 1];
          if (previous && previous[1] === y - 1) previous[1] = y;
          else rows.push([y, y]);
        }
        if (rows.length !== 2)
          throw new Error('Expected two separate circles in the source wordmark.');
        const lowerCircleTop = rows[1][0];
        const neutral = [1, 3, 5].map((start) =>
          parseInt(tokens.colorValues.lightTextPrimary.slice(start, start + 2), 16),
        );
        const darkNeutral = [1, 3, 5].map((start) =>
          parseInt(tokens.colorValues.wordmarkDarkForeground.slice(start, start + 2), 16),
        );
        const sourceBlue = [1, 3, 5].map((start) =>
          parseInt(tokens.colorValues.blueAccent.slice(start, start + 2), 16),
        );
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
              // Preserve antialiased blue/gray mixtures along the eyes and mouth.
              const accentWeight = Math.max(
                0,
                Math.min(
                  1,
                  (original.data[i + 2] - original.data[i]) / (sourceBlue[2] - sourceBlue[0]),
                ),
              );
              const isFace = x >= circleLeft && x <= circleRight && y >= lowerCircleTop;
              const foreground = mode === 'dark' && !isFace ? darkNeutral : neutral;
              for (let channel = 0; channel < 3; channel++) {
                result.data[i + channel] =
                  color[channel] * accentWeight + foreground[channel] * (1 - accentWeight);
              }
              result.data[i + 3] = original.data[i + 3];
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
