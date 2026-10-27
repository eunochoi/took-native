import { useI18n } from '../../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { AppIcon } from '../../components/AppIcon';
import { EmotionImage } from '../../components/EmotionImage';
import { EMOTIONS } from '../../domain/constants';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { diaryQueries } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HomeTodayItem } from './HomeTodayItem';

export function HomeTodayDiary({ today }: { today: string }) {
  const { t } = useI18n();
  const db = useSQLiteContext();
  const { rem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const diary = useQuery(diaryQueries.byDate(db, today));
  const emotion = diary.data?.emotion ?? null;
  const status = diary.isError
    ? t('home.loadFailed')
    : emotion === null
      ? t('home.noRecord')
      : t('home.diaryStatus', { value: t(`emotions.${EMOTIONS[emotion].key}`) });

  return (
    <HomeTodayItem
      title={t('home.diaryTitle')}
      status={status}
      pending={diary.isPending}
      disabled={diary.isPending || diary.isError}
      accessibilityLabel={t('home.diaryLink', { value: status })}
      onPress={() =>
        openModal(
          diary.data
            ? `/diary/${diary.data.id}`
            : { pathname: '/diary/new', params: { date: today } },
        )
      }
    >
      {!diary.isError && emotion !== null ? (
        <EmotionImage emotion={emotion} size={rem * 3} iconStyle="basic" />
      ) : (
        <AppIcon name="diary" size={rem * 3} className="text-theme-text-disabled" />
      )}
    </HomeTodayItem>
  );
}
