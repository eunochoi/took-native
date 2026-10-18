import { View } from 'react-native';
import { habitProgressBand } from '../../domain/calendar';
import { PROGRESS_TRACK_CLASS_NAME } from '../../theme/classes';

export function CalendarHabitProgress({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  const progress = Number.isFinite(ratio) ? Math.min(100, Math.max(0, ratio * 100)) : 0;
  const band = habitProgressBand(progress);
  if (!band) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel="습관 완료율"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progress,
        text: `${done}/${total}개 완료`,
      }}
      className={`h-2 w-full shrink-0 rounded-full ${PROGRESS_TRACK_CLASS_NAME}`}
    >
      <View
        className={`h-full ${band === 'low' ? 'bg-theme-progress-low' : band === 'medium' ? 'bg-theme-progress-medium' : 'bg-theme-progress-high'}`}
        style={{ width: `${progress}%` }}
      />
    </View>
  );
}
