import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

for (const malformed of [false, true]) {
  test(`version bump ${malformed ? 'leaves every platform untouched on invalid iOS metadata' : 'synchronizes both native apps and OTA runtimes'}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'took-version-'));
    try {
      mkdirSync(join(root, 'scripts'));
      mkdirSync(join(root, 'android/app/src/main/res/values'), { recursive: true });
      mkdirSync(join(root, 'ios/app/Supporting'), { recursive: true });
      copyFileSync(
        new URL('../scripts/bump-version.cjs', import.meta.url),
        join(root, 'scripts/bump-version.cjs'),
      );
      const files = {
        'app.json': JSON.stringify({
          expo: { version: '2.1.5', android: { versionCode: 25 }, ios: { buildNumber: '1' } },
        }),
        'package.json': JSON.stringify({ version: '2.1.5' }),
        'android/app/build.gradle': 'versionCode 25\nversionName "2.1.5"',
        'android/app/src/main/res/values/strings.xml':
          '<string name="expo_runtime_version">2.1.5</string>',
        'ios/app/Info.plist':
          '<key>CFBundleShortVersionString</key>\n<string>2.1.5</string>\n<key>CFBundleVersion</key>\n<string>1</string>',
        'ios/app/Supporting/Expo.plist': malformed
          ? 'invalid'
          : '<key>EXUpdatesRuntimeVersion</key>\n<string>2.1.5</string>',
      };
      for (const [file, value] of Object.entries(files)) writeFileSync(join(root, file), value);
      const bump = () =>
        execFileSync(process.execPath, [join(root, 'scripts/bump-version.cjs')], { stdio: 'pipe' });
      if (malformed) {
        assert.throws(bump, /Cannot find iOS OTA runtime version/);
        for (const [file, value] of Object.entries(files))
          assert.equal(readFileSync(join(root, file), 'utf8'), value);
      } else {
        bump();
        const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
        assert.equal(app.version, '2.1.6');
        assert.equal(app.android.versionCode, 26);
        assert.equal(app.ios.buildNumber, '2');
        assert.equal(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, '2.1.6');
        for (const file of Object.keys(files).filter((file) => !file.endsWith('.json'))) {
          const value = readFileSync(join(root, file), 'utf8');
          assert(value.includes('2.1.6'));
          assert(!value.includes('2.1.5'));
        }
        assert.match(
          readFileSync(join(root, 'ios/app/Info.plist'), 'utf8'),
          /CFBundleVersion<\/key>\s*<string>2<\/string>/,
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
