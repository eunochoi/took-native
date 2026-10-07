const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Verified against the installed Galaxy weather provider's colorful metadata.
// Standard Android launchers continue to use widgetprovider_sober.xml.
module.exports = function withSamsungSoberWidget(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    const receiver = app.receiver?.find((item) => item.$['android:name'] === '.widget.Sober');
    if (!receiver)
      throw new Error(
        'Place the Samsung plugin before react-native-android-widget in the Expo plugins list.',
      );
    receiver['meta-data'] = receiver['meta-data']
      ? Array.isArray(receiver['meta-data'])
        ? receiver['meta-data']
        : [receiver['meta-data']]
      : [];
    const name = 'samsung.appwidget.colorful.info';
    receiver['meta-data'] = receiver['meta-data'].filter((item) => item.$['android:name'] !== name);
    receiver['meta-data'].push({
      $: { 'android:name': name, 'android:resource': '@xml/took_sober_samsung' },
    });
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const resources = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res');
      await fs.mkdir(path.join(resources, 'values'), { recursive: true });
      await fs.mkdir(path.join(resources, 'xml'), { recursive: true });
      await fs.writeFile(
        path.join(resources, 'values/took_samsung_widget_attrs.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <attr name="targetHost"><flag name="home" value="0x1" /></attr>
  <attr name="widgetSize"><flag name="medium" value="0x8" /></attr>
  <attr name="featuredWidget"><flag name="medium" value="0x8" /></attr>
  <attr name="initialLayoutMedium" format="reference" />
  <attr name="configure" format="string" />
  <attr name="allowMultipleSizes" format="boolean" />
</resources>
`,
      );
      await fs.writeFile(
        path.join(resources, 'xml/took_sober_samsung.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<samsung-appwidget-info xmlns:app="http://schemas.android.com/apk/res-auto"
  app:targetHost="home"
  app:widgetSize="medium"
  app:featuredWidget="medium"
  app:initialLayoutMedium="@layout/rn_widget"
  app:configure="${mod.android.package}.WidgetConfigurationActivity"
  app:allowMultipleSizes="false" />
`,
      );
      return mod;
    },
  ]);
};
