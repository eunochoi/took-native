import { useRef, useState } from 'react';
import { View, useWindowDimensions, type ScrollView } from 'react-native';
import { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScrollView } from '../../components/AnimatedScrollView';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { EmotionImage } from '../../components/EmotionImage';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { EMOTIONS } from '../../domain/constants';
import { DIARY_EMOTION_GROUPS, type DiaryEmotionGroup } from '../../domain/diaryFilters';
import { useAppTheme } from '../../theme/AppThemeProvider';

const categories = ['positive', 'neutral', 'negative'] as const;
const categoryDescriptions: Record<DiaryEmotionGroup, string> = {
  positive: '마음이 밝거나 편안했던 순간',
  neutral: '담담함부터 피로, 미묘하게 섞인 마음까지',
  negative: '마음이 무겁거나 복잡했던 순간',
};

export function DiaryEmotionPicker({
  value,
  allowDeselect = false,
  onClose,
  onApply,
}: {
  value: number | null;
  allowDeselect?: boolean;
  onClose: () => void;
  onApply: (value: number | null) => void;
}) {
  const { rem: appRem } = useAppTheme();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [categoryId, setCategoryId] = useState<DiaryEmotionGroup>(
    () =>
      categories.find(
        (id) =>
          value !== null &&
          (DIARY_EMOTION_GROUPS[id].emotions as readonly number[]).includes(value),
      ) ?? 'positive',
  );
  const category = DIARY_EMOTION_GROUPS[categoryId];
  const emotionIds: readonly number[] = category.emotions;
  const [gridWidth, setGridWidth] = useState(Math.max(0, width - appRem * 4));
  const [topHeight, setTopHeight] = useState(0);
  const columns = gridWidth >= appRem * 20 * fontScale + appRem * 0.75 ? 2 : 1;
  const rows = Array.from({ length: Math.ceil(emotionIds.length / columns) }, (_, row) =>
    emotionIds.slice(row * columns, (row + 1) * columns),
  );
  const sheetHeight = Math.min(height * 0.95, height - insets.top);
  const pinTop = sheetHeight - insets.bottom - topHeight >= appRem * 20 * fontScale;
  const contentKey = `${categoryId}-${columns}-${pinTop ? 'fixed' : 'scroll'}`;
  const scrollRef = useAnimatedRef<ScrollView>();
  const opened = useRef(false);
  const initialScrollPending = useRef(true);
  const initialRowY = useRef<number | null>(null);
  const gridY = useRef(0);

  function revealInitialSelection() {
    if (
      opened.current &&
      initialScrollPending.current &&
      initialRowY.current !== null &&
      scrollRef.current
    ) {
      scrollRef.current.scrollTo({
        y: Math.max(0, gridY.current + initialRowY.current - appRem),
        animated: true,
      });
      initialScrollPending.current = false;
    }
  }

  const topContent = (
    <View
      className="shrink-0 gap-4 pt-4 pb-2"
      onLayout={(event) => setTopHeight(event.nativeEvent.layout.height)}
    >
      <View className="flex-row flex-wrap gap-2">
        {categories.map((id) => (
          <PickerOption
            key={id}
            selected={categoryId === id}
            accessibilityLabel={`${DIARY_EMOTION_GROUPS[id].label} 카테고리`}
            className="min-h-12 rounded-full px-4 py-2"
            onPress={() => {
              if (categoryId === id) return;
              initialScrollPending.current = false;
              initialRowY.current = null;
              setCategoryId(id);
            }}
          >
            <Text
              className={`text-sm ${categoryId === id ? 'font-semibold text-theme-accent' : 'text-theme-text-secondary'}`}
            >
              {DIARY_EMOTION_GROUPS[id].label}
            </Text>
          </PickerOption>
        ))}
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl border border-theme-accent/10 bg-theme-accent-light/20 p-4">
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-theme-surface">
          <EmotionImage emotion={category.emotions[0]} size={appRem * 2.75} />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <Text className="text-base font-semibold text-theme-accent-deep">{category.label}</Text>
          <Text
            className="text-sm leading-5 tracking-tight text-theme-text-secondary"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {categoryDescriptions[categoryId]}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <BottomSheetModal
      visible
      fixedHeight
      scrollFade
      title={allowDeselect ? '어떤 감정의 기록을 볼까요?' : '오늘의 감정을 골라주세요'}
      onClose={onClose}
      scrollRef={scrollRef}
      contentKey={contentKey}
      fixedContent={pinTop ? topContent : undefined}
      onOpened={() => {
        opened.current = true;
        revealInitialSelection();
      }}
      renderScrollView={(scrollProps) => (
        <AnimatedScrollView
          {...scrollProps}
          key={contentKey}
          contentContainerClassName="gap-3 pt-4 pb-7"
          onContentSizeChange={(width, contentHeight) => {
            if (typeof scrollProps.onContentSizeChange === 'function') {
              scrollProps.onContentSizeChange(width, contentHeight);
            }
            revealInitialSelection();
          }}
        >
          {!pinTop && topContent}
          <View
            className="gap-3"
            onLayout={(event) => {
              gridY.current = event.nativeEvent.layout.y;
              setGridWidth(event.nativeEvent.layout.width);
              revealInitialSelection();
            }}
          >
            {rows.map((row) => (
              <View
                key={row.join('-')}
                className="flex-row gap-3"
                onLayout={(event) => {
                  if (value !== null && row.includes(value) && initialScrollPending.current) {
                    initialRowY.current = event.nativeEvent.layout.y;
                    revealInitialSelection();
                  }
                }}
              >
                {row.map((id) => {
                  const emotion = EMOTIONS[id];
                  const selected = draft === id;
                  return (
                    <View key={emotion.key} className="flex-1 min-w-0">
                      <PickerOption
                        selected={selected}
                        accessibilityLabel={`${emotion.name}, ${emotion.description}`}
                        className="flex-1 w-full gap-2 rounded-2xl px-4 py-6"
                        onPress={() => {
                          initialScrollPending.current = false;
                          setDraft(allowDeselect && selected ? null : id);
                        }}
                      >
                        <EmotionImage emotion={id} size={appRem * 4} />
                        <Text
                          className={`text-base text-center font-semibold ${selected ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                        >
                          {emotion.name}
                        </Text>
                        <Text
                          className="w-full text-center text-sm leading-5 tracking-tight text-theme-text-secondary"
                          lineBreakStrategyIOS="hangul-word"
                          textBreakStrategy="balanced"
                        >
                          {emotion.description}
                        </Text>
                      </PickerOption>
                    </View>
                  );
                })}
                {row.length < columns && <View className="flex-1" />}
              </View>
            ))}
          </View>
        </AnimatedScrollView>
      )}
      footer={(closePicker) => (
        <Button
          labelWeight="normal"
          label={allowDeselect ? '적용하기' : '선택 완료'}
          disabled={!allowDeselect && draft === null}
          onPress={() => closePicker(() => onApply(draft))}
        />
      )}
    />
  );
}
