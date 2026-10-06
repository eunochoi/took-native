import { Image, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RecordHeader } from '../src/components/RecordHeader';
import { mediaUri, validFileName } from '../src/media';
import { Text } from '../src/components/Text';
export default function ImageScreen() {
  const { file } = useLocalSearchParams<{ file: string }>();
  return (
    <View className="flex-1 bg-theme-surface">
      <RecordHeader backRoute="/" title="사진" />
      {file && validFileName(file) ? (
        <Image
          source={{ uri: mediaUri(file) }}
          resizeMode="contain"
          className="flex-1 w-full"
          accessibilityLabel="일기 첨부 사진"
        />
      ) : (
        <Text>사진을 찾을 수 없습니다.</Text>
      )}
    </View>
  );
}
