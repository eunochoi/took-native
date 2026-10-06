const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
}
const source = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src'))];
const forbidden =
  /next-auth|@prisma|react-native-webview|ReactNativeWebView|account-deletion|authAction|useCurrentUser|PanelDialog|AppPageLayout|ScrollContainer|https?:\/\/to-ok\.me/;
for (const file of source) {
  const text = fs.readFileSync(file, 'utf8');
  // The settings link opens the public introduction in an external browser.
  const boundaryText =
    path.relative(root, file) === 'app/(tabs)/setting.tsx'
      ? text.replace(
          /Linking\.openURL\('https:\/\/to-ok\.me\/intro'\)/g,
          'Linking.openURL(externalIntro)',
        )
      : text;
  assert(!forbidden.test(boundaryText), `Forbidden web/account dependency: ${file}`);
  assert(!/from ['"][^'"]*(?:took\/next|took-expo-app)/.test(text), `Sibling dependency: ${file}`);
  assert(!/\bfetch\s*\(|XMLHttpRequest|axios/.test(text), `Unexpected networking: ${file}`);
}
const routes = walk(path.join(root, 'app'));
assert(!routes.some((file) => /intro|login|account|@panel/.test(path.relative(root, file))));
assert(fs.existsSync(path.join(root, 'app/(tabs)/index.tsx')));
const privacy = fs.readFileSync(path.join(root, 'app/privacy.tsx'), 'utf8');
assert(privacy.includes('<BottomSheetPage') && privacy.includes('<Text'));
const sheetPage = fs.readFileSync(path.join(root, 'src/components/BottomSheetPage.tsx'), 'utf8');
const sheetModal = fs.readFileSync(path.join(root, 'src/components/BottomSheetModal.tsx'), 'utf8');
const sheetViewport = fs.readFileSync(
  path.join(root, 'src/components/BottomSheetScrollViewport.tsx'),
  'utf8',
);
assert(
  sheetPage.includes('<BottomSheetModal') &&
    sheetModal.includes('<BottomSheetScrollViewport') &&
    sheetViewport.includes('<AnimatedScrollView'),
);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(!pkg.dependencies['react-native-webview']);
assert(!pkg.dependencies['next']);
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
assert.deepEqual(config.platforms, ['android']);
assert.equal(config.android.package, 'com.everstamp');
assert.equal(config.userInterfaceStyle, 'automatic');
assert(!config.ios && !pkg.scripts.ios);
assert(!fs.existsSync(path.join(root, 'ios')));
for (const file of source) {
  const text = fs.readFileSync(file, 'utf8');
  assert(
    !/Fredoka|settings\.(mode|accent|font)\b|Platform\.OS/.test(text),
    `Retired platform/font code: ${file}`,
  );
}
const settings = fs.readFileSync(path.join(root, 'src/settings/model.ts'), 'utf8');
assert(!/\bmode:|\baccent:|\bfont:/.test(settings));
assert.equal(config.android.allowBackup, false);
assert.equal(config.updates.enabled, false);
console.log(
  `Boundary checks passed: ${source.length} source files; no web/account routes, networking calls, or sibling imports.`,
);
