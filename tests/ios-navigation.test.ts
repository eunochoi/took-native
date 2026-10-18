import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('iOS bundle script executes a native script whose path contains spaces after regeneration', () => {
  const module: any = { exports: {} };
  let action: any;
  runInNewContext(
    readFileSync(new URL('../plugins/withIosBuildSettings.cjs', import.meta.url), 'utf8'),
    {
      module,
      require: () => ({
        withXcodeProject: (config: any, callback: any) => {
          action = callback;
          return config;
        },
      }),
    },
  );
  module.exports({});
  const phase = {
    shellScript: JSON.stringify('`"$NODE_BINARY" --print "react-native-xcode.sh"`\n'),
  };
  const other = { shellScript: JSON.stringify('echo other') };
  const literalLines = {
    shellScript: JSON.stringify('`"$NODE_BINARY" --print "react-native-xcode.sh"`\n').replace(
      /\\n/g,
      '\n',
    ),
  };
  const mod = {
    modResults: {
      hash: { project: { objects: { PBXShellScriptBuildPhase: { phase, other, literalLines } } } },
    },
  };
  action(mod);
  const fixed = phase.shellScript;
  action(mod);
  assert.equal(phase.shellScript, fixed);
  assert.equal(other.shellScript, JSON.stringify('echo other'));
  assert.equal(literalLines.shellScript, fixed);
  const root = mkdtempSync(join(tmpdir(), 'took ios scripts-'));
  try {
    const nativeScript = join(root, 'react-native-xcode.sh');
    const node = join(root, 'node binary');
    writeFileSync(nativeScript, '#!/bin/bash\necho native-bundle-ok\n', { mode: 0o755 });
    writeFileSync(node, '#!/bin/bash\nprintf "%s\\n" "$TEST_NATIVE_SCRIPT"\n', { mode: 0o755 });
    const result = execFileSync('/bin/bash', ['-c', JSON.parse(fixed)], {
      env: { ...process.env, NODE_BINARY: node, TEST_NATIVE_SCRIPT: nativeScript },
      encoding: 'utf8',
    });
    assert.equal(result.trim(), 'native-bundle-ok');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('iOS scene plugin preserves app setup and linking while moving window startup to Expo', () => {
  const module: any = { exports: {} };
  let info: any;
  let delegate: any;
  runInNewContext(
    readFileSync(new URL('../plugins/withIosSceneLifecycle.cjs', import.meta.url), 'utf8'),
    {
      module,
      require: () => ({
        withInfoPlist: (config: any, action: any) => {
          info = action;
          return config;
        },
        withAppDelegate: (config: any, action: any) => {
          delegate = action;
          return config;
        },
      }),
    },
  );
  module.exports({});
  const source = `class AppDelegate: ExpoAppDelegate {
    reactNativeFactory = factory
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  // Linking API`;
  const mod = { modResults: { contents: source, language: 'swift' } };
  const result = delegate(mod);
  assert(result.modResults.contents.includes('ExpoReactNativeFactoryProvider'));
  assert(result.modResults.contents.includes('reactNativeFactory = factory'));
  assert(result.modResults.contents.includes('// Linking API'));
  assert(!result.modResults.contents.includes('factory.startReactNative('));
  assert.equal(delegate(result).modResults.contents, result.modResults.contents);
  const plist = info({ modResults: {} }).modResults;
  assert.equal(
    plist.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0]
      .UISceneDelegateClassName,
    'EXExpoAppSceneDelegate',
  );
  assert.throws(
    () => delegate({ modResults: { language: 'swift', contents: 'unexpected template' } }),
    /Cannot apply/,
  );
});
