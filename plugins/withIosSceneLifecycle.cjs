const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    const source = mod.modResults.contents;
    if (source.includes('ExpoReactNativeFactoryProvider')) return mod;
    const startup =
      /    window = UIWindow\(frame: UIScreen\.main\.bounds\)\s+factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\s*\)/;
    if (mod.modResults.language !== 'swift' || !startup.test(source)) {
      throw new Error('Cannot apply the TOOK iOS scene lifecycle to this AppDelegate template.');
    }
    mod.modResults.contents = source
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      )
      .replace(startup, '    // ExpoAppSceneDelegate creates the window and starts React Native.');
    return mod;
  });
};
