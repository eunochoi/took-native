const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

module.exports = function withAndroidBuildSettings(config) {
  config = withGradleProperties(config, (mod) => {
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
    for (const key of [
      'android.enableMinifyInReleaseBuilds',
      'android.enableShrinkResourcesInReleaseBuilds',
    ]) {
      const property = mod.modResults.find((item) => item.type === 'property' && item.key === key);
      if (property) property.value = 'true';
      else mod.modResults.push({ type: 'property', key, value: 'true' });
    }
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      'proguard-android.txt',
      'proguard-android-optimize.txt',
    );
    return mod;
  });
};
