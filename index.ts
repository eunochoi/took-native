import './global.css';
import { TurboModuleRegistry } from 'react-native';

// Expo Go and an older development build do not include the native widget module.
if (TurboModuleRegistry.get('AndroidWidget')) {
  const {
    registerWidgetTaskHandler,
    registerWidgetConfigurationScreen,
  } = require('react-native-android-widget');
  const { soberWidgetTask } = require('./src/widgets/sober/task');
  const { SoberWidgetConfiguration } = require('./src/widgets/sober/ConfigurationScreen');
  registerWidgetTaskHandler(soberWidgetTask);
  registerWidgetConfigurationScreen(SoberWidgetConfiguration);
}
require('expo-router/entry');
