import { Image, type ImageProps } from 'react-native';
import { useSettings } from '../settings/SettingsProvider';
import { useAppTheme } from '../theme/AppThemeProvider';
const images = {
  blue: {
    light: require('../../assets/ui/wordmark-blue-light.png'),
    dark: require('../../assets/ui/wordmark-blue-dark.png'),
  },
  purple: {
    light: require('../../assets/ui/wordmark-purple-light.png'),
    dark: require('../../assets/ui/wordmark-purple-dark.png'),
  },
  pink: {
    light: require('../../assets/ui/wordmark-pink-light.png'),
    dark: require('../../assets/ui/wordmark-pink-dark.png'),
  },
  green: {
    light: require('../../assets/ui/wordmark-green-light.png'),
    dark: require('../../assets/ui/wordmark-green-dark.png'),
  },
  yellow: {
    light: require('../../assets/ui/wordmark-yellow-light.png'),
    dark: require('../../assets/ui/wordmark-yellow-dark.png'),
  },
  grey: {
    light: require('../../assets/ui/wordmark-grey-light.png'),
    dark: require('../../assets/ui/wordmark-grey-dark.png'),
  },
};
const dimensions = Image.resolveAssetSource(images.blue.light);

export function Wordmark({
  size = 36,
  mode,
  onLoad,
  onError,
}: {
  size?: number;
  mode?: 'light' | 'dark';
  onLoad?: ImageProps['onLoad'];
  onError?: ImageProps['onError'];
}) {
  const { settings } = useSettings();
  const theme = useAppTheme();
  return (
    <Image
      source={images[settings.themeAccent][mode ?? theme.mode]}
      accessibilityLabel="BlooLog 로고"
      accessible
      className="shrink-0"
      style={{ height: size, width: size * (dimensions.width / dimensions.height) }}
      resizeMode="contain"
      onLoad={onLoad}
      onError={onError}
    />
  );
}
