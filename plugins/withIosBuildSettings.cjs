const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withIosBuildSettings(config) {
  const widgetGroup = config.ios?.infoPlist?.TookWidgetAppGroup;
  if (
    widgetGroup &&
    !config.ios.entitlements?.['com.apple.security.application-groups']?.includes(widgetGroup)
  ) {
    throw new Error('The widget App Group must be included in the app entitlements.');
  }
  return withXcodeProject(config, (mod) => {
    for (const configuration of Object.values(
      mod.modResults.hash.project.objects.XCBuildConfiguration ?? {},
    )) {
      const settings = configuration?.buildSettings;
      // Project configurations are inherited by extension targets created later by apple-targets.
      if (widgetGroup && settings) {
        settings.TOOK_WIDGET_APP_GROUP = JSON.stringify(widgetGroup);
      }
    }
    for (const phase of Object.values(
      mod.modResults.hash.project.objects.PBXShellScriptBuildPhase,
    )) {
      if (
        !phase ||
        typeof phase !== 'object' ||
        !phase.shellScript?.includes('react-native-xcode.sh')
      )
        continue;
      // Xcode project writers may preserve literal line breaks inside quoted shell scripts.
      const script = JSON.parse(
        phase.shellScript.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
      );
      // The Expo template executes an unquoted command substitution, splitting spaced paths.
      const quoted = script.replace(
        /^`(.+react-native-xcode\.sh.+)`$/m,
        (_, command) => `"$(${command})"`,
      );
      phase.shellScript = JSON.stringify(quoted);
    }
    return mod;
  });
};
