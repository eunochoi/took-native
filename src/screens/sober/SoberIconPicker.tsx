import { useI18n } from '../../i18n/react';
import { IconPicker, type IconCategory } from '../../components/IconPicker';
import { SoberIcon } from '../../components/SoberIcon';
import { SOBER_ICONS, type SoberIconKey } from '../../domain/sober';
import type { HabitIconColorKey } from '../../domain/constants';
import { SOBER_ICON_CATEGORIES } from './soberIconCategories';

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
  const { t } = useI18n();

  const options = (Object.keys(SOBER_ICONS) as SoberIconKey[]).map((key) => ({
    key,
    label: t(`soberIcons.${key}`),
  }));
  const [first, ...others] = SOBER_ICON_CATEGORIES;
  const categories: [IconCategory<SoberIconKey>, ...IconCategory<SoberIconKey>[]] = [
    {
      ...first,
      label: t(`soberCategories.${first.id}`),
      description: t(`soberCategories.${first.id}Description`),
    },
    ...others.map((category) => ({
      ...category,
      label: t(`soberCategories.${category.id}`),
      description: t(`soberCategories.${category.id}Description`),
    })),
  ];
  return (
    <IconPicker
      title={t('sober.iconPicker')}
      value={value}
      options={options}
      categories={categories}
      renderIcon={(key) => <SoberIcon name={key} colorKey={colorKey} />}
      onApply={onApply}
      onClose={onClose}
    />
  );
}
