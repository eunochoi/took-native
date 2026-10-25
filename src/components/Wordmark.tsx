import { Image, type ImageProps } from 'react-native';
const images = {
  light: require('../../assets/ui/wordmark.png'),
  dark: require('../../assets/ui/wordmark-dark.png'),
};
const dimensions = Image.resolveAssetSource(images.light);

export function Wordmark({
  size = 36,
  mode = 'light',
  onLoad,
  onError,
}: {
  size?: number;
  mode?: 'light' | 'dark';
  onLoad?: ImageProps['onLoad'];
  onError?: ImageProps['onError'];
}) {
  return (
    <Image
      source={images[mode]}
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
