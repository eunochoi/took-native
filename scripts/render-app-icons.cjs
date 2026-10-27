const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { generateImageAsync } = expoRequire('@expo/image-utils');

(async () => {
  const source = path.join(root, 'assets/icon-source.png');
  for (const size of [1024, 512]) {
    const filename = size === 1024 ? 'icon.png' : 'icon-512.png';
    const image = await generateImageAsync(
      { projectRoot: root, cacheType: 'bloolog-app-icon' },
      {
        src: source,
        name: filename,
        width: size,
        height: size,
        resizeMode: 'cover',
        backgroundColor: '#FFFFFF',
        removeTransparency: true,
      },
    );
    fs.writeFileSync(path.join(root, 'assets', filename), image.source);
    console.log(`Generated assets/${filename} (${size}×${size}, opaque).`);
  }
  if (process.argv.includes('--sync-native')) {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
    const plugins = path.join(
      path.dirname(expoRequire.resolve('@expo/prebuild-config')),
      'plugins/icons',
    );
    if (fs.existsSync(path.join(root, 'android'))) {
      const { setIconAsync, getIcon, getAdaptiveIcon } = require(
        path.join(plugins, 'withAndroidIcons.js'),
      );
      const adaptive = getAdaptiveIcon(config);
      await setIconAsync(root, {
        icon: adaptive.foregroundImage || getIcon(config),
        backgroundColor: adaptive.backgroundColor,
        backgroundImage: adaptive.backgroundImage,
        monochromeImage: adaptive.monochromeImage,
        isAdaptive: !!config.android?.adaptiveIcon,
      });
      console.log('Updated existing Android launcher icon resources.');
    }
    if (fs.existsSync(path.join(root, 'ios'))) {
      const { setIconsAsync } = require(path.join(plugins, 'withIosIcons.js'));
      await setIconsAsync(config, root);
      console.log('Updated existing iOS AppIcon asset catalog.');
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
