const {
  withAppBuildGradle,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withAndroidDevApp(config) {
  config = withAppBuildGradle(config, (mod) => {
    const marker = '// Took development app';
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `
${marker}
android.buildTypes.debug.applicationIdSuffix = ".dev"
`;
    }
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    // The widget library emits a package-specific action before the debug suffix is applied.
    for (const receiver of mod.modResults.manifest.application?.[0]?.receiver ?? []) {
      for (const filter of receiver['intent-filter'] ?? []) {
        for (const action of filter.action ?? []) {
          if (action.$['android:name'] === `${config.android.package}.WIDGET_CLICK`) {
            action.$['android:name'] = '${applicationId}.WIDGET_CLICK';
          }
        }
      }
    }
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const values = path.join(mod.modRequest.platformProjectRoot, 'app/src/debug/res/values');
      await fs.mkdir(values, { recursive: true });
      await fs.writeFile(
        path.join(values, 'took_dev.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources><string name="app_name">took dev</string></resources>\n',
      );
      return mod;
    },
  ]);
};
