import type { ScrollView } from 'react-native';
import { useState } from 'react';
import { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { AnimatedScrollView } from '../../components/AnimatedScrollView';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import type { DraftImage } from '../../media';
import { Text } from '../../components/Text';
import { DIARY_IMAGE_MAX_COUNT } from '../../domain/constants';

function PhotoTile({
  image,
  index,
  count,
  busy,
  onRemove,
  onReorder,
}: {
  image: DraftImage;
  index: number;
  count: number;
  busy: boolean;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <View className="relative h-28 w-24 rounded-2xl overflow-hidden">
      <Image
        source={{ uri: image.uri }}
        accessibilityLabel={`첨부 사진 ${index + 1}`}
        className="w-full h-full"
        resizeMode="cover"
      />
      <View className="absolute bottom-2 left-2 h-6 w-6 items-center justify-center rounded-full bg-black/50">
        <Text className="text-xs text-white">{index + 1}</Text>
      </View>
      <Pressable
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`사진 ${index + 1} 삭제`}
        onPress={onRemove}
        hitSlop={appRem * 0.25}
        className={`absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-black/50 ${busy ? 'opacity-40' : 'opacity-100'}`}
      >
        <AppIcon name="close" size={appRem} color="white" />
      </Pressable>
      <View className="absolute bottom-2 right-2">
        <Sortable.Handle>
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={`사진 ${index + 1} 순서 변경`}
            accessibilityHint="좌우로 끌어 사진 순서를 변경하세요."
            accessibilityState={{ disabled: busy }}
            accessibilityActions={[
              { name: 'decrement', label: '앞으로 이동' },
              { name: 'increment', label: '뒤로 이동' },
            ]}
            onAccessibilityAction={(event) => {
              if (busy) return;
              const target = index + (event.nativeEvent.actionName === 'decrement' ? -1 : 1);
              if (target >= 0 && target < count) onReorder(index, target);
            }}
            className="h-6 w-6 items-center justify-center rounded-full bg-black/50"
          >
            <AppIcon name="drag-indicator" size={appRem} color="white" />
          </View>
        </Sortable.Handle>
      </View>
    </View>
  );
}

export function DiaryFormImages({
  images,
  busy,
  picking,
  onPick,
  onRemove,
  onReorder,
  onDragging,
}: {
  images: DraftImage[];
  busy: boolean;
  picking: boolean;
  onPick: () => void;
  onRemove: (file: string) => void;
  onReorder: (from: number, to: number) => void;
  onDragging: (value: boolean) => void;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const scrollRef = useAnimatedRef<ScrollView>();
  const [dragging, setDragging] = useState(false);
  return (
    <AnimatedScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-3 py-2">
        {images.length > 0 && (
          <Sortable.Grid
            data={images}
            keyExtractor={(image) => image.file}
            rows={1}
            rowHeight={appRem * 7}
            columnGap={appRem * 0.75}
            customHandle
            sortEnabled={!busy}
            scrollableRef={scrollRef}
            autoScrollDirection="horizontal"
            onDragStart={() => {
              setDragging(true);
              onDragging(true);
            }}
            onDragEnd={({ fromIndex, toIndex }) => {
              onReorder(fromIndex, toIndex);
              setDragging(false);
              onDragging(false);
            }}
            renderItem={({ item: image, index }) => (
              <PhotoTile
                image={image}
                index={index}
                count={images.length}
                busy={busy || dragging}
                onRemove={() => onRemove(image.file)}
                onReorder={onReorder}
              />
            )}
          />
        )}
        {images.length < DIARY_IMAGE_MAX_COUNT && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="사진 추가"
            disabled={busy || dragging}
            onPress={onPick}
            className={`h-28 w-24 rounded-2xl border border-dashed border-theme-accent bg-theme-surface/40 items-center justify-center gap-2 ${busy || dragging ? 'opacity-40' : 'opacity-100'}`}
          >
            {picking ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <AppIcon name="add" size={appRem * 1.75} color={colors.accent} />
            )}
            <Text className="text-xs text-theme-text-secondary">사진 추가</Text>
          </Pressable>
        )}
      </View>
    </AnimatedScrollView>
  );
}
