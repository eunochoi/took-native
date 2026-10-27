import { useI18n } from '../../i18n/react';
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
  const { t } = useI18n();

  const { images, detail, square, onPress } = props;
  if (images.length === 0) return null;
  if (!detail && images.length === 1) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('diary.photoDetail', { count: 1 })}
        onPress={onPress}
        className={`w-full ${square ? 'aspect-square ios:curve-continuous rounded-xl border border-theme-border-muted' : 'aspect-[4/3] ios:curve-continuous rounded-lg'} overflow-hidden`}
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
  const { t } = useI18n();

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
                  ? t('diary.photoAction', {
                      count: index + 1,
                      value: fullView === item.id ? t('diary.crop') : t('diary.fullPhoto'),
                    })
                  : t('diary.photoDetail', { count: index + 1 })
              }
              accessibilityState={detail ? { selected: fullView === item.id } : undefined}
              onPress={detail ? () => setFullView(fullView === item.id ? null : item.id) : onPress}
              style={{ width, height }}
              className={
                detail
                  ? 'ios:curve-continuous rounded-theme overflow-hidden bg-black/75 border border-theme-border-muted'
                  : square
                    ? 'ios:curve-continuous rounded-xl overflow-hidden border border-theme-border-muted'
                    : 'ios:curve-continuous rounded-lg overflow-hidden'
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
          accessibilityLabel={t('diary.photoPage', { count: page + 1, value: images.length })}
          className="flex-row justify-center py-1.5"
        >
          {images.map((image, index) => (
            <View
              key={image.id}
              className={`m-[3px] h-2 ios:curve-continuous rounded-theme ${page === index ? 'bg-theme-accent w-5' : 'bg-theme-accent/80 w-2'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
