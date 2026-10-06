import { memo } from 'react';
import { Image } from 'react-native';
import { EMOTIONS } from '../domain/constants';
import { useSettings } from '../settings/SettingsProvider';
import type { Settings } from '../settings/model';
const basic = [
  require('../../assets/emotions/basic/happy.png'),
  require('../../assets/emotions/basic/joyful.png'),
  require('../../assets/emotions/basic/love.png'),
  require('../../assets/emotions/basic/calm.png'),
  require('../../assets/emotions/basic/surprised.png'),
  require('../../assets/emotions/basic/anxious.png'),
  require('../../assets/emotions/basic/sad.png'),
  require('../../assets/emotions/basic/angry.png'),
  require('../../assets/emotions/basic/confused.png'),
  require('../../assets/emotions/basic/unknown.png'),
];
const simple = [
  require('../../assets/emotions/simple/happy.png'),
  require('../../assets/emotions/simple/joyful.png'),
  require('../../assets/emotions/simple/love.png'),
  require('../../assets/emotions/simple/calm.png'),
  require('../../assets/emotions/simple/surprised.png'),
  require('../../assets/emotions/simple/anxious.png'),
  require('../../assets/emotions/simple/sad.png'),
  require('../../assets/emotions/simple/angry.png'),
  require('../../assets/emotions/simple/confused.png'),
  require('../../assets/emotions/simple/unknown.png'),
];
const emoji = [
  require('../../assets/emotions/emoji/happy.png'),
  require('../../assets/emotions/emoji/joyful.png'),
  require('../../assets/emotions/emoji/love.png'),
  require('../../assets/emotions/emoji/calm.png'),
  require('../../assets/emotions/emoji/surprised.png'),
  require('../../assets/emotions/emoji/anxious.png'),
  require('../../assets/emotions/emoji/sad.png'),
  require('../../assets/emotions/emoji/angry.png'),
  require('../../assets/emotions/emoji/confused.png'),
  require('../../assets/emotions/emoji/unknown.png'),
];
interface EmotionProps {
  emotion: number;
  size: number;
  fill: boolean;
}

// Explicit previews do not subscribe to the user's chosen icon style.
const EmotionArtwork = memo(function EmotionArtwork({
  emotion,
  size,
  fill,
  iconStyle: style,
}: EmotionProps & { iconStyle: Settings['emotionStyle'] }) {
  const value = EMOTIONS[emotion] ?? EMOTIONS[9];
  const artwork = style === 'emoji' ? emoji : style === 'simple' ? simple : basic;
  return (
    <Image
      accessibilityLabel={value.name}
      source={artwork[emotion] ?? artwork[9]}
      className={fill ? 'w-full h-full' : undefined}
      style={{
        ...(fill ? {} : { width: size, height: size }),
        transform: [{ scale: style === 'simple' ? 0.85 : 1 }],
      }}
      fadeDuration={0}
      resizeMode="contain"
    />
  );
});

function PreferredEmotionImage(props: EmotionProps) {
  const { settings } = useSettings();
  return <EmotionArtwork {...props} iconStyle={settings.emotionStyle} />;
}

export function EmotionImage({
  emotion,
  size = 44,
  fill = false,
  iconStyle,
}: {
  emotion: number;
  size?: number;
  fill?: boolean;
  iconStyle?: Settings['emotionStyle'];
}) {
  return iconStyle === undefined ? (
    <PreferredEmotionImage emotion={emotion} size={size} fill={fill} />
  ) : (
    <EmotionArtwork emotion={emotion} size={size} fill={fill} iconStyle={iconStyle} />
  );
}
