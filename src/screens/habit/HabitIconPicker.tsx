import { useI18n } from '../../i18n/react';
import { IconPicker, type IconCategory } from '../../components/IconPicker';
import { HabitIcon } from '../../components/HabitIcon';
import { HABIT_ICON_CATEGORIES } from './habitIconCategories';
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
  const { t } = useI18n();

  const [firstCategory, ...otherCategories] = HABIT_ICON_CATEGORIES;
  const categories: [IconCategory<HabitIconKey>, ...IconCategory<HabitIconKey>[]] = [
    {
      ...firstCategory,
      label: t(`habitCategories.${firstCategory.id}`),
      description: t(`habitCategories.${firstCategory.id}Description`),
    },
    ...otherCategories.map((category) => ({
      ...category,
      label: t(`habitCategories.${category.id}`),
      description: t(`habitCategories.${category.id}Description`),
    })),
  ];
  return (
    <IconPicker
      title={t('habit.iconPicker')}
      value={value}
      options={HABIT_ICON_OPTIONS.map((option) => ({
        ...option,
        label: t(`habitIcons.${option.key}`),
      }))}
      categories={categories}
      renderIcon={(key) => <HabitIcon name={key} colorKey={colorKey} />}
      onApply={onApply}
      onClose={onClose}
    />
  );
}
