import { Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BottomSheetPage } from '../src/components/BottomSheetPage';
import { mediaUri, validFileName } from '../src/media';
import { Text } from '../src/components/Text';
export default function ImageScreen() {
  const { height } = useWindowDimensions();
  const { file } = useLocalSearchParams<{ file: string }>();
  return (
    <BottomSheetPage backRoute="/" title="사진" scrollFade={false}>
      {file && validFileName(file) ? (
        <Image
          source={{ uri: mediaUri(file) }}
          resizeMode="contain"
          className="w-full"
          style={{ height: height * 0.65 }}
          accessibilityLabel="일기 첨부 사진"
        />
      ) : (
        <Text>사진을 찾을 수 없습니다.</Text>
      )}
    </BottomSheetPage>
  );
}
