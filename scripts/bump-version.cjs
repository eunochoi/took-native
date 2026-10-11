const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'app.json');
const packagePath = path.join(root, 'package.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const current = app.expo.version;
const requested = process.argv[2];
const parts = current.split('.').map(Number);
const version = requested ?? `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Use a version such as 2.1.2.');
}
if (version === current) {
  throw new Error(`Version is already ${current}. Choose a new version.`);
}
const versionCode = app.expo.android.versionCode + 1;

// Prepare every file before writing, so an unexpected native layout leaves versions untouched.
const files = new Map();
const gradlePath = path.join(root, 'android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
  const gradle = fs.readFileSync(gradlePath, 'utf8');
  if (!/\bversionCode \d+/.test(gradle) || !/\bversionName "[^"]+"/.test(gradle)) {
    throw new Error('Cannot find Android version fields in build.gradle.');
  }
  files.set(
    gradlePath,
    gradle
      .replace(/\bversionCode \d+/, `versionCode ${versionCode}`)
      .replace(/\bversionName "[^"]+"/, `versionName "${version}"`),
  );
}
const stringsPath = path.join(root, 'android/app/src/main/res/values/strings.xml');
if (fs.existsSync(stringsPath)) {
  const strings = fs.readFileSync(stringsPath, 'utf8');
  const runtime = /(<string name="expo_runtime_version">)[^<]*(<\/string>)/;
  if (!runtime.test(strings)) throw new Error('Cannot find Android OTA runtime version.');
  files.set(
    stringsPath,
    strings.replace(runtime, (_, start, end) => `${start}${version}${end}`),
  );
}
app.expo.version = version;
app.expo.android.versionCode = versionCode;
pkg.version = version;
files.set(appPath, JSON.stringify(app, null, 2) + '\n');
files.set(packagePath, JSON.stringify(pkg, null, 2) + '\n');
for (const [file, content] of files) fs.writeFileSync(file, content);
console.log(`${current} → ${version} (Android versionCode ${versionCode})`);
