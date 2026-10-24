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
  const db = useSQLiteContext();
  const { rem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const diary = useQuery(diaryQueries.byDate(db, today));
  const emotion = diary.data?.emotion ?? null;
  const status = diary.isError
    ? '불러오기 실패'
    : emotion === null
      ? '기록 없음'
      : `'${EMOTIONS[emotion].name}' 기록 남김`;

  return (
    <HomeTodayItem
      title="오늘의 일기"
      status={status}
      pending={diary.isPending}
      disabled={diary.isPending || diary.isError}
      accessibilityLabel={`오늘의 일기 이동, ${status}`}
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
