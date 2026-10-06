import { useAppTheme } from '../../theme/AppThemeProvider';
import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, View, useWindowDimensions } from 'react-native';
import type { DiaryImage } from '../../db/types';
import { mediaUri } from '../../media';

type DiaryGalleryProps = {
  images: DiaryImage[];
  detail?: boolean;
  square?: boolean;
  onPress?: () => void;
};

export function DiaryGallery(props: DiaryGalleryProps) {
  const { images, detail, square, onPress } = props;
  if (images.length === 0) return null;
  if (!detail && images.length === 1) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진 1 일기 상세보기"
        onPress={onPress}
        className={`w-full ${square ? 'aspect-square rounded-xl border-2 border-theme-border-muted' : 'aspect-[4/3] rounded-lg'} overflow-hidden`}
      >
        <Image
          source={{ uri: mediaUri(images[0].file_name) }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </Pressable>
    );
  }
  return <DiaryGalleryPages {...props} />;
}

function DiaryGalleryPages({ images, detail = false, square = false, onPress }: DiaryGalleryProps) {
  const { rem: appRem } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [fullView, setFullView] = useState<number | null>(null);
  const list = useRef<FlatList<DiaryImage>>(null);
  const gap = appRem * 0.5;
  const height = detail ? Math.min(windowWidth * 0.9, 440) : square ? width : (width * 3) / 4;
  return (
    <View
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next !== width) {
          setWidth(next);
          setPage(0);
          setFullView(null);
          list.current?.scrollToOffset({ offset: 0, animated: false });
        }
      }}
    >
      {width > 0 && (
        <FlatList
          showsVerticalScrollIndicator={false}
          key={width}
          ref={list}
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(image) => String(image.id)}
          snapToInterval={width + gap}
          decelerationRate="fast"
          style={{ height }}
          ItemSeparatorComponent={() => <View className="w-2" />}
          onMomentumScrollEnd={(event) => {
            setPage(
              Math.max(
                0,
                Math.min(
                  images.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / (width + gap)),
                ),
              ),
            );
            setFullView(null);
          }}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                detail
                  ? `사진 ${index + 1} ${fullView === item.id ? '크롭해서 보기' : '전체 보기'}`
                  : `사진 ${index + 1} 일기 상세보기`
              }
              accessibilityState={detail ? { selected: fullView === item.id } : undefined}
              onPress={detail ? () => setFullView(fullView === item.id ? null : item.id) : onPress}
              style={{ width, height }}
              className={
                detail
                  ? 'rounded-theme overflow-hidden bg-black/75 border-2 border-theme-border-muted'
                  : square
                    ? 'rounded-xl overflow-hidden border-2 border-theme-border-muted'
                    : 'rounded-lg overflow-hidden'
              }
            >
              <Image
                source={{ uri: mediaUri(item.file_name) }}
                className="w-full h-full"
                resizeMode={detail && fullView === item.id ? 'contain' : 'cover'}
              />
            </Pressable>
          )}
        />
      )}
      {images.length > 1 && (
        <View
          accessibilityLabel={`사진 ${page + 1} / ${images.length}`}
          className="flex-row justify-center py-1.5"
        >
          {images.map((image, index) => (
            <View
              key={image.id}
              className={`m-[3px] h-2 rounded-theme ${page === index ? 'bg-theme-accent w-5' : 'bg-theme-accent/80 w-2'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
