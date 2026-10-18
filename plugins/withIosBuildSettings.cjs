const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withIosBuildSettings(config) {
  return withXcodeProject(config, (mod) => {
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
