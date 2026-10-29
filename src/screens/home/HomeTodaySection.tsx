import { View } from 'react-native';
import { RECORD_SURFACE_CLASS_NAME } from '../../theme/classes';
import { HomeTodayDiary } from './HomeTodayDiary';
import { HomeTodayHabit } from './HomeTodayHabit';
import { HomeTodaySober } from './HomeTodaySober';

export function HomeTodaySection({ today }: { today: string }) {
  return (
    <View
      className={`${RECORD_SURFACE_CLASS_NAME} flex-row rounded-2xl px-1 py-4 ios:curve-continuous`}
    >
      <View className="w-1/3 min-w-0">
        <HomeTodayDiary today={today} />
      </View>
      <View className="w-1/3 min-w-0 border-l border-theme-accent/20">
        <HomeTodayHabit today={today} />
      </View>
      <View className="w-1/3 min-w-0 border-l border-theme-accent/20">
        <HomeTodaySober />
      </View>
    </View>
  );
}
