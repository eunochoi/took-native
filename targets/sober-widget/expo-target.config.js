/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TookSoberWidget',
  displayName: 'Cut Back Timer',
  bundleIdentifier: '.sober-widget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
