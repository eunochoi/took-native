const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withAndroidBuildMemory(config) {
  return withGradleProperties(config, (mod) => {
    const jvmArgs = mod.modResults.find(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    if (jvmArgs) {
      jvmArgs.value = /(?:^|\s)-XX:MaxMetaspaceSize=\S+/.test(jvmArgs.value)
        ? jvmArgs.value.replace(/-XX:MaxMetaspaceSize=\S+/g, '-XX:MaxMetaspaceSize=1024m')
        : `${jvmArgs.value} -XX:MaxMetaspaceSize=1024m`;
    } else {
      mod.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx2048m -XX:MaxMetaspaceSize=1024m',
      });
    }
    return mod;
  });
};
