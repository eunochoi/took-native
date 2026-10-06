import { IconPicker } from '../../components/IconPicker';
import { HabitIcon } from '../../components/HabitIcon';
import {
  HABIT_ICON_OPTIONS,
  type HabitIconKey,
  type HabitIconColorKey,
} from '../../domain/constants';

export function HabitIconPicker({
  value,
  colorKey,
  onApply,
  onClose,
}: {
  value: HabitIconKey;
  colorKey: HabitIconColorKey;
  onApply: (value: HabitIconKey) => void;
  onClose: () => void;
}) {
  return (
    <IconPicker
      title="아이콘"
      value={value}
      options={HABIT_ICON_OPTIONS}
      renderIcon={(key) => <HabitIcon name={key} colorKey={colorKey} />}
      onApply={onApply}
      onClose={onClose}
    />
  );
}
