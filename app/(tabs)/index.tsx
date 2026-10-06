import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { useToday } from '../../src/queries';
import { HomeRecordsModal } from '../../src/screens/home/HomeRecordsModal';
import { HomeTopSection } from '../../src/screens/home/HomeTopSection';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function Home() {
  const today = useToday();
  const { iconSizes, navigationBottom, navigationHeight } = useAppTheme();
  const [recordsOpen, setRecordsOpen] = useState(false);
  useFocusEffect(useCallback(() => () => setRecordsOpen(false), []));
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <HomeTopSection today={today} />
      <View className="shrink-0" style={{ paddingBottom: navigationBottom * 2 + navigationHeight }}>
        <View className="gap-2 px-[6%] pt-6">
          <Text className="text-lg font-bold text-theme-text-primary">
            쌓인 기록을 함께 살펴볼까요?
          </Text>
          <Text className="text-base text-theme-text-secondary">
            일기, 습관, 절제의 변화를 한곳에서 파악헤요.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="모아보기"
            accessibilityState={{ expanded: recordsOpen }}
            onPress={() => setRecordsOpen(true)}
            className="py-2 my-3 self-end flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Text className="text-base font-semibold text-theme-accent-deep">모아보기</Text>
            <AppIcon name="arrow-forward" size={iconSizes.md} className="text-theme-accent-deep" />
          </Pressable>
        </View>
      </View>
      <HomeRecordsModal visible={recordsOpen} today={today} onClose={() => setRecordsOpen(false)} />
    </ColorView>
  );
}
