import { View } from 'react-native';

export function ProgressBar({
  value,
  accessibilityLabel,
  accessibilityValueText,
}: {
  value: number;
  accessibilityLabel?: string;
  accessibilityValueText?: string;
}) {
  const progress = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: progress, text: accessibilityValueText }}
      className="h-4 w-full overflow-hidden rounded-full bg-theme-border-muted"
    >
      <View className="h-full rounded-full bg-theme-accent" style={{ width: `${progress}%` }} />
    </View>
  );
}
