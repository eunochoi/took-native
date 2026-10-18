import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { PROGRESS_FILL_CLASS_NAME, PROGRESS_TRACK_CLASS_NAME } from '../theme/classes';

export function ProgressBar({
  value,
  color,
  accessibilityLabel,
  accessibilityValueText,
  className,
}: {
  value: number;
  color?: string;
  accessibilityLabel?: string;
  accessibilityValueText?: string;
  className?: string;
}) {
  const progress = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: progress, text: accessibilityValueText }}
      className={twMerge('h-5 w-full rounded-full', PROGRESS_TRACK_CLASS_NAME, className)}
    >
      <View
        className={`h-full ${color ? '' : PROGRESS_FILL_CLASS_NAME}`}
        style={{ width: `${progress}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </View>
  );
}
