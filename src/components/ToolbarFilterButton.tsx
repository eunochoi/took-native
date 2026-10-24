import type { ReactNode } from 'react';
import { ToolbarButton } from './ToolbarButton';

export function ToolbarFilterButton({
  onPress,
  label,
  accessibilityLabel,
}: {
  onPress: () => void;
  label: string | ReactNode[];
  accessibilityLabel: string;
}) {
  return (
    <ToolbarButton
      icon="filter-list"
      label={label}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    />
  );
}
