import { useI18n } from '../src/i18n/react';
import { Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BottomSheetPage } from '../src/components/BottomSheetPage';
import { mediaUri, validFileName } from '../src/media';
import { Text } from '../src/components/Text';
export default function ImageScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const { file } = useLocalSearchParams<{ file: string }>();
  return (
    <BottomSheetPage backRoute="/" title={t('ui.photoTitle')} scrollFade={false}>
      {file && validFileName(file) ? (
        <Image
          source={{ uri: mediaUri(file) }}
          resizeMode="contain"
          className="w-full"
          style={{ height: height * 0.65 }}
          accessibilityLabel={t('ui.diaryPhoto')}
        />
      ) : (
        <Text>{t('errors.photoMissing')}</Text>
      )}
    </BottomSheetPage>
  );
}
