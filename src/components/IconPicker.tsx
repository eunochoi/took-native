import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AnimatedScrollView } from './AnimatedScrollView';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { PickerOption } from './PickerOption';
import { Text } from './Text';

export interface IconCategory<Key extends string> {
  id: string;
  label: string;
  description: string;
  keys: readonly Key[];
}

export function IconPicker<Key extends string>({
  title,
  value,
  options,
  categories,
  renderIcon,
  onApply,
  onClose,
}: {
  title: string;
  value: Key;
  options: readonly { key: Key; label: string }[];
  categories: readonly [IconCategory<Key>, ...IconCategory<Key>[]];
  renderIcon: (key: Key) => ReactNode;
  onApply: (value: Key) => void;
  onClose: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [categoryId, setCategoryId] = useState(
    () => categories.find(({ keys }) => keys.includes(value))?.id ?? categories[0].id,
  );
  const category = categories.find(({ id }) => id === categoryId) ?? categories[0];
  const scrollRef = useAnimatedRef<ScrollView>();
  const chipScrollRef = useRef<ScrollView>(null);
  const [chipLayouts, setChipLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const [chipViewportWidth, setChipViewportWidth] = useState(0);
  const [chipContentWidth, setChipContentWidth] = useState(0);
  const [topHeight, setTopHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(Math.max(0, width - appRem * 4));
  const gridY = useRef(0);
  const columns = Math.max(
    1,
    Math.min(3, Math.floor((gridWidth + appRem * 0.75) / (appRem * 6 * fontScale + appRem * 0.75))),
  );
  const cardWidth = Math.floor((gridWidth - appRem * 0.75 * (columns - 1)) / columns) - 1;
  const opened = useRef(false);
  const initialScrollPending = useRef(true);
  const initialRowY = useRef<number | null>(null);
  const sheetHeight = Math.min(height * 0.95, height - insets.top);
  // Reserve room for the sheet header, footer and readable list rows at larger font sizes.
  const pinTop = sheetHeight - insets.bottom - topHeight >= appRem * 20 * fontScale;
  const contentKey = `${category.id}-${pinTop ? 'fixed' : 'scroll'}`;

  useEffect(() => {
    const layout = chipLayouts[categoryId];
    if (layout && chipViewportWidth > 0) {
      chipScrollRef.current?.scrollTo({
        x: Math.min(
          Math.max(0, chipContentWidth - chipViewportWidth),
          Math.max(0, layout.x - (chipViewportWidth - layout.width) / 2),
        ),
        animated: false,
      });
    }
  }, [categoryId, chipLayouts, chipViewportWidth, chipContentWidth, pinTop]);

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
      <ScrollView
        ref={chipScrollRef}
        horizontal
        // Undo the 5% sheet inset relative to its 90%-wide content.
        className="grow-0 shrink-0 -mx-[5.555556%]"
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
        contentContainerStyle={{ paddingHorizontal: chipViewportWidth * 0.05 }}
        bounces={false}
        overScrollMode="never"
        directionalLockEnabled
        onLayout={(event) => setChipViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setChipContentWidth(width)}
      >
        {categories.map(({ id, label }) => (
          <View
            key={id}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setChipLayouts((previous) =>
                previous[id]?.x === x && previous[id]?.width === width
                  ? previous
                  : { ...previous, [id]: { x, width } },
              );
            }}
          >
            <PickerOption
              selected={category.id === id}
              accessibilityLabel={`${label} 카테고리`}
              className="min-h-12 rounded-full px-4 py-2"
              onPress={() => {
                if (category.id === id) return;
                initialScrollPending.current = false;
                initialRowY.current = null;
                setCategoryId(id);
              }}
            >
              <Text
                className={`text-sm ${category.id === id ? 'font-semibold text-theme-accent' : 'text-theme-text-secondary'}`}
              >
                {label}
              </Text>
            </PickerOption>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center gap-3 rounded-2xl border border-theme-accent/10 bg-theme-accent-light/20 p-4">
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-theme-surface">
          {renderIcon(category.keys[0])}
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <Text className="text-base font-semibold text-theme-accent-deep">{category.label}</Text>
          <Text
            className="text-sm leading-5 tracking-tight text-theme-text-secondary"
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {category.description}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <BottomSheetModal
      visible
      fixedHeight
      contentFullBleed
      scrollFade
      title={title}
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
          contentContainerClassName="gap-3 px-[5%] pt-4 pb-7"
          onContentSizeChange={(width, contentHeight) => {
            if (typeof scrollProps.onContentSizeChange === 'function') {
              scrollProps.onContentSizeChange(width, contentHeight);
            }
            revealInitialSelection();
          }}
        >
          {!pinTop && topContent}
          <View
            className="flex-row flex-wrap gap-3"
            onLayout={(event) => {
              gridY.current = event.nativeEvent.layout.y;
              setGridWidth(event.nativeEvent.layout.width);
              revealInitialSelection();
            }}
          >
            {category.keys.map((key) => {
              const label = options.find((option) => option.key === key)!.label;
              return (
                <View
                  key={key}
                  className="aspect-square"
                  style={{ width: cardWidth }}
                  onLayout={(event) => {
                    if (key === value && initialScrollPending.current) {
                      initialRowY.current = event.nativeEvent.layout.y;
                      revealInitialSelection();
                    }
                  }}
                >
                  <PickerOption
                    selected={draft === key}
                    accessibilityLabel={label}
                    className="h-full w-full min-h-0 gap-2 rounded-2xl p-2"
                    onPress={() => {
                      initialScrollPending.current = false;
                      setDraft(key);
                    }}
                  >
                    <View className="h-10 items-center justify-center">{renderIcon(key)}</View>
                    <View
                      className="w-full items-center justify-center"
                      style={{ height: appRem * 2.5 * fontScale }}
                    >
                      <Text
                        className={`text-sm leading-5 tracking-tight text-center font-semibold ${draft === key ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                      >
                        {label}
                      </Text>
                    </View>
                  </PickerOption>
                </View>
              );
            })}
          </View>
        </AnimatedScrollView>
      )}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="선택 완료"
          onPress={() => close(() => onApply(draft))}
        />
      )}
    />
  );
}
