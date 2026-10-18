/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TookSoberWidget',
  displayName: '툭 로그 거리두기',
  bundleIdentifier: '.sober-widget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
