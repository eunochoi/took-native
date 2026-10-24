const fs = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const { chromium } = require('playwright');
const ts = require('typescript');
const faceGlyphs = require('./emotion-face-glyphs.json');

const root = path.resolve(__dirname, '..');
const source = ts.createSourceFile(
  'constants.ts',
  fs.readFileSync(path.join(root, 'src/domain/constants.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
);
const declaration = source.statements
  .flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  )
  .find((value) => value.name.getText(source) === 'EMOTIONS');
const data = {};
runInNewContext(
  ts.transpileModule(`exports.emotions = ${declaration.initializer.getText(source)};`, {})
    .outputText,
  { exports: data },
);
const emotions = data.emotions.filter(({ key }) => key === 'tired' || key === 'mixed');
// The existing set shares this exact alpha mask. Never redraw its outline.
const pawTemplate = fs
  .readFileSync(path.join(root, 'assets/emotions/basic/unknown.png'))
  .toString('base64');

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      [
        chromium.executablePath(),
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ].find((file) => fs.existsSync(file)),
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 256, height: 256 },
      deviceScaleFactor: 1,
    });
    for (const emotion of emotions) {
      const { key, color, emoji } = emotion;
      const ink =
        '#' +
        [1, 3, 5]
          .map((offset) =>
            Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.55 + 17 * 0.45)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('');
      const face = `<path d="${faceGlyphs[key].path}" fill="${ink}" fill-rule="evenodd"/>`;
      for (const style of ['basic', 'simple', 'emoji']) {
        let body;
        if (style === 'basic') {
          const png = await page.evaluate(
            async ({ template, color, face, transform }) => {
              const image = new Image();
              image.src = `data:image/png;base64,${template}`;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 256;
              const context = canvas.getContext('2d');
              context.drawImage(image, 0, 0);
              const templatePixels = context.getImageData(0, 0, 256, 256);
              context.clearRect(0, 0, 256, 256);
              const expression = new Image();
              expression.src =
                'data:image/svg+xml;base64,' +
                btoa(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><g transform="${transform}">${face}</g></svg>`,
                );
              await expression.decode();
              context.drawImage(expression, 0, 0);
              const pixels = context.getImageData(0, 0, 256, 256);
              const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
              for (let i = 0; i < pixels.data.length; i += 4) {
                const coverage = pixels.data[i + 3] / 255;
                for (let channel = 0; channel < 3; channel++) {
                  pixels.data[i + channel] =
                    pixels.data[i + channel] * coverage + rgb[channel] * (1 - coverage);
                }
                pixels.data[i + 3] = templatePixels.data[i + 3];
              }
              context.putImageData(pixels, 0, 0);
              return canvas.toDataURL('image/png').split(',')[1];
            },
            {
              template: pawTemplate,
              color,
              face,
              transform: 'translate(55.6 101.6) scale(0.275)',
            },
          );
          fs.writeFileSync(
            path.join(root, 'assets/emotions/basic', `${key}.png`),
            Buffer.from(png, 'base64'),
          );
          continue;
        } else if (style === 'simple') {
          body = `<path d="M128 0C199 0 256 48 256 122s-49 134-123 134S0 208 0 134 54 0 128 0Z" fill="${color}"/>
            <g transform="translate(23.04 23.04) scale(0.41)">${face}</g>`;
        } else {
          body = `<text x="128" y="138" text-anchor="middle" dominant-baseline="central" font-size="194.56" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>`;
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`;
        await page.setContent(`<style>body{margin:0;background:transparent}</style>${svg}`);
        await page.screenshot({
          path: path.join(root, 'assets/emotions', style, `${key}.png`),
          omitBackground: true,
        });
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Rendered ${emotions.length * 3} emotion assets.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
