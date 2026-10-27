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
      await fs.mkdir(path.join(resources, 'layout'), { recursive: true });
      await fs.mkdir(path.join(resources, 'values-ko'), { recursive: true });
      // Launcher metadata follows Android's resource locale, independently of JS startup.
      for (const [directory, label, description] of [
        [
          'values',
          'Cut Back Timer',
          'Check elapsed time and goals for your selected Cut Back item.',
        ],
        ['values-ko', '거리두기 타이머', '선택한 거리두기의 경과 시간과 목표를 확인해요.'],
      ]) {
        await fs.writeFile(
          path.join(resources, directory, 'took_sober_widget_strings.xml'),
          `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="took_sober_widget_label">${label}</string>
  <string name="took_sober_widget_description">${description}</string>
</resources>
`,
        );
      }
      await fs.writeFile(
        path.join(resources, 'layout/took_sober_preview.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:layout_width="match_parent"
  android:layout_height="match_parent">
  <ImageView
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:src="@drawable/sober_preview"
    android:scaleType="fitCenter" />
</FrameLayout>
`,
      );
      const providerPath = path.join(resources, 'xml/widgetprovider_sober.xml');
      const provider = await fs.readFile(providerPath, 'utf8');
      await fs.writeFile(
        providerPath,
        provider
          .replace(
            /android:description="[^"]*"/,
            'android:description="@string/took_sober_widget_description"',
          )
          .replace(/\s+android:previewLayout="[^"]*"/g, '')
          .replace(
            '<appwidget-provider',
            '<appwidget-provider\n    android:previewLayout="@layout/took_sober_preview"',
          ),
      );
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
  app:initialLayoutMedium="@layout/took_sober_preview"
  app:configure="${mod.android.package}.WidgetConfigurationActivity"
  app:allowMultipleSizes="false" />
`,
      );
      return mod;
    },
  ]);
};
