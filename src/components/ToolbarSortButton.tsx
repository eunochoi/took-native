import { useI18n } from '../i18n/react';
import { ToolbarButton } from './ToolbarButton';

export function ToolbarSortButton({
  sort,
  priorityFirst = false,
  recordSort,
  sortLabel,
  accessibilityLabel,
  onPress,
}: {
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  recordSort?: 'ASC' | 'DESC';
  sortLabel?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const showPriority = sort !== 'CUSTOM' && priorityFirst;
  const displayLabel =
    sort === 'CUSTOM'
      ? t('ui.custom')
      : [
          showPriority ? t('ui.priorityShort') : null,
          recordSort === 'ASC' ? t('ui.shortRecords') : null,
          sort === 'ASC' ? t('ui.older') : null,
        ]
          .filter(Boolean)
          .join(' · ') || t('ui.sort');
  const label =
    sort === 'CUSTOM'
      ? t('ui.custom')
      : `${recordSort ? `${t('ui.currentRecord', { value: t(recordSort === 'DESC' ? 'ui.longest' : 'ui.shortest') })} · ` : ''}${sortLabel ?? t('ui.createdDate')} ${t(sort === 'DESC' ? 'ui.newest' : 'ui.oldest')}`;
  return (
    <ToolbarButton
      icon="sort"
      label={displayLabel}
      accessibilityLabel={`${accessibilityLabel}, ${showPriority ? `${t('ui.priorityFirst')} · ` : ''}${label}`}
      onPress={onPress}
    />
  );
}
