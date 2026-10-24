import { useState } from 'react';
import { View, type ScrollView } from 'react-native';
import { HABIT_ICON_COLORS, type HabitIconColorKey } from '../domain/constants';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AnimatedFlatList } from './AnimatedFlatList';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { PickerOption } from './PickerOption';
import { Text } from './Text';

export function IconColorPicker({
  value,
  onApply,
  onClose,
}: {
  value: HabitIconColorKey;
  onApply: (value: HabitIconColorKey) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const { colors } = useAppTheme();
  const keys: HabitIconColorKey[] = [
    'theme',
    ...(Object.keys(HABIT_ICON_COLORS) as (keyof typeof HABIT_ICON_COLORS)[]),
  ];
  return (
    <BottomSheetModal
      visible
      title="아이콘 색상"
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="선택 완료"
          onPress={() => close(() => onApply(draft))}
        />
      )}
      renderScrollView={({ ref, ...scrollProps }) => (
        <AnimatedFlatList
          {...scrollProps}
          ref={(list) => {
            const nativeScroll = list?.getNativeScrollRef();
            ref(nativeScroll && 'scrollTo' in nativeScroll ? (nativeScroll as ScrollView) : null);
          }}
          data={keys}
          numColumns={4}
          keyExtractor={(key) => key}
          contentContainerClassName="gap-1 pt-6 pb-7"
          columnWrapperClassName="gap-1"
          renderItem={({ item: key }) => {
            const { value: backgroundColor, label } =
              key === 'theme' ? { value: colors.accent, label: '기본' } : HABIT_ICON_COLORS[key];
            return (
              <View className="flex-1 min-w-0">
                <PickerOption
                  compact
                  className="aspect-[0.85] w-full min-h-0 justify-center gap-2 rounded-2xl p-2"
                  selected={draft === key}
                  accessibilityLabel={label}
                  onPress={() => setDraft(key)}
                >
                  <View
                    className="h-9 w-9 shrink-0 ios:curve-continuous rounded-full"
                    style={{ backgroundColor }}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className={`w-full text-sm leading-5 tracking-tight text-center ${draft === key ? 'font-semibold text-theme-accent' : 'text-theme-text-secondary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            );
          }}
        />
      )}
    />
  );
}
