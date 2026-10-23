import { Image, type ImageProps } from 'react-native';
import { ACCENT_PALETTES } from '../theme/colors';

const images = {
  light: {
    blue: require('../../assets/ui/wordmark.png'),
    green: require('../../assets/ui/wordmark-green.png'),
    purple: require('../../assets/ui/wordmark-purple.png'),
    pink: require('../../assets/ui/wordmark-pink.png'),
    yellow: require('../../assets/ui/wordmark-yellow.png'),
    grey: require('../../assets/ui/wordmark-grey.png'),
  },
  dark: {
    blue: require('../../assets/ui/wordmark-blue-dark.png'),
    green: require('../../assets/ui/wordmark-green-dark.png'),
    purple: require('../../assets/ui/wordmark-purple-dark.png'),
    pink: require('../../assets/ui/wordmark-pink-dark.png'),
    yellow: require('../../assets/ui/wordmark-yellow-dark.png'),
    grey: require('../../assets/ui/wordmark-grey-dark.png'),
  },
};
const dimensions = Image.resolveAssetSource(images.light.blue);

export function Wordmark({
  size = 36,
  mode = 'light',
  accentColor = ACCENT_PALETTES.blue.accent,
  onLoad,
  onError,
}: {
  size?: number;
  mode?: 'light' | 'dark';
  accentColor?: string;
  onLoad?: ImageProps['onLoad'];
  onError?: ImageProps['onError'];
}) {
  const accent =
    (Object.keys(images.light) as (keyof typeof images.light)[]).find(
      (name) => ACCENT_PALETTES[name].accent.toLowerCase() === accentColor.toLowerCase(),
    ) ?? 'blue';

  return (
    <Image
      source={images[mode][accent]}
      accessibilityLabel="TOOK"
      accessible
      className="shrink-0"
      style={{ height: size, width: size * (dimensions.width / dimensions.height) }}
      resizeMode="contain"
      onLoad={onLoad}
      onError={onError}
    />
  );
}
