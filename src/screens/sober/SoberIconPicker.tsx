import { IconPicker } from '../../components/IconPicker';
import { SoberIcon } from '../../components/SoberIcon';
import { SOBER_ICONS, type SoberIconKey } from '../../domain/sober';
import type { HabitIconColorKey } from '../../domain/constants';

const options = (Object.keys(SOBER_ICONS) as SoberIconKey[]).map((key) => ({
  key,
  label: SOBER_ICONS[key].label,
}));
export function SoberIconPicker({
  value,
  colorKey,
  onApply,
  onClose,
}: {
  value: SoberIconKey;
  colorKey: HabitIconColorKey;
  onApply: (value: SoberIconKey) => void;
  onClose: () => void;
}) {
  return (
    <IconPicker
      title="아이콘"
      value={value}
      options={options}
      renderIcon={(key) => <SoberIcon name={key} colorKey={colorKey} />}
      onApply={onApply}
      onClose={onClose}
    />
  );
}
