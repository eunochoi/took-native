import { View } from 'react-native';

export function CalendarHabitProgress({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  const progress = Number.isFinite(ratio) ? Math.min(100, Math.max(0, ratio * 100)) : 0;
  if (progress === 0) return null;
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
      className="h-1.5 w-full shrink-0 overflow-hidden ios:curve-continuous rounded-full bg-theme-border-muted"
    >
      <View className="h-full ios:curve-continuous rounded-full bg-theme-accent/70" style={{ width: `${progress}%` }} />
    </View>
  );
}
