import { View } from 'react-native';
import { RECORD_SURFACE_CLASS_NAME } from '../../theme/classes';
import { HomeTodayDiary } from './HomeTodayDiary';
import { HomeTodayHabit } from './HomeTodayHabit';
import { HomeTodaySober } from './HomeTodaySober';

export function HomeTodaySection({ today }: { today: string }) {
  return (
    <View className={`${RECORD_SURFACE_CLASS_NAME} rounded-2xl px-1 py-5 ios:curve-continuous`}>
      <View className="flex-row">
        <View className="flex-1 min-w-0">
          <HomeTodayDiary today={today} />
        </View>
        <View className="flex-1 min-w-0 border-l border-theme-accent/20">
          <HomeTodayHabit today={today} />
        </View>
        <View className="flex-1 min-w-0 border-l border-theme-accent/20">
          <HomeTodaySober />
        </View>
      </View>
    </View>
  );
}
