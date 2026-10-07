import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import { sortSobers } from '../../db/sober';
import { EMOTIONS } from '../../domain/constants';
import { getSoberSummary, SOBER_DAY_MS } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { diaryQueries, habitQueries, soberQueries } from '../../queries';
import { useSettings } from '../../settings/SettingsProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { RECORD_SURFACE_CLASS_NAME } from '../../theme/classes';

const recordCardClass = `${RECORD_SURFACE_CLASS_NAME} flex-row items-center gap-3 min-h-12 p-3.5 rounded-2xl active:opacity-70`;
const recordIconContainerClass = 'h-10 w-10 shrink-0 items-center justify-center';
const recordIconClass = 'text-theme-accent';
const recordChevronClass = 'text-theme-text-tertiary';
const recordContentClass = 'flex-1 min-w-0 gap-1';
const recordTitleClass = 'text-sm leading-4 font-semibold';
const recordStatusClass = 'text-sm leading-5 text-theme-text-secondary';
const recordLoadingClass = 'h-4 w-24 rounded-lg bg-theme-skeleton';
const recordTextStyle = { includeFontPadding: false };

export function TodayRecordSection({ today }: { today: string }) {
  const { iconSizes, rem: appRem } = useAppTheme();
  const { settings } = useSettings();
  const now = useCurrentMinute();
  const db = useSQLiteContext();
  const router = useRouter();
  const diary = useQuery(diaryQueries.byDate(db, today));
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, today, today));
  const sobers = useQuery(soberQueries.list(db));
  const sober = sortSobers(sobers.data ?? [], settings)[0];
  const restarts = useQuery({ ...soberQueries.restarts(db, sober?.id), enabled: !!sober });
  const habitPending = habits.isPending || completions.isPending;
  const habitError = habits.isError || completions.isError;
  const soberPending = sobers.isPending || (!!sober && restarts.isPending);
  const soberError = sobers.isError || (!!sober && restarts.isError);
  const soberDays =
    sober && restarts.data
      ? Math.floor(getSoberSummary(sober, restarts.data, now).duration / SOBER_DAY_MS) + 1
      : null;
  return (
    <View className="py-1 gap-2">
      <View className={recordCardClass}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="오늘의 감정 일기 이동"
          accessibilityState={{ disabled: diary.isPending || diary.isError }}
          disabled={diary.isPending || diary.isError}
          onPress={() =>
            router.push(
              diary.data
                ? `/diary/${diary.data.id}`
                : { pathname: '/diary/new', params: { date: today } },
            )
          }
          className="min-h-10 min-w-0 flex-1 flex-row items-center gap-1 active:opacity-70"
        >
          <View className={recordContentClass}>
            <Text numberOfLines={1} className={recordTitleClass} style={recordTextStyle}>
              오늘의 일기
            </Text>
            {diary.isPending ? (
              <View
                accessibilityLabel="일기 확인 중"
                className={`${recordLoadingClass} max-w-full`}
              />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                className={recordStatusClass}
                style={recordTextStyle}
              >
                {diary.isError
                  ? '불러오기 실패'
                  : diary.data
                    ? `'${EMOTIONS[diary.data.emotion].name}' 기록`
                    : '아직 기록 없음'}
              </Text>
            )}
          </View>
          <AppIcon name="chevron-right" size={iconSizes.md} className={recordChevronClass} />
        </Pressable>
        <View className="w-px self-stretch bg-theme-accent/20" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="오늘의 습관 이동"
          onPress={() => router.push('/habit')}
          className="min-h-10 min-w-0 flex-1 flex-row items-center gap-1 active:opacity-70"
        >
          <View className={recordContentClass}>
            <Text numberOfLines={1} className={recordTitleClass} style={recordTextStyle}>
              오늘의 습관
            </Text>
            {habitPending ? (
              <View
                accessibilityLabel="습관 확인 중"
                className={`${recordLoadingClass} max-w-full`}
              />
            ) : (
              <Text numberOfLines={1} className={recordStatusClass} style={recordTextStyle}>
                {habitError
                  ? '불러오기 실패'
                  : `${habits.data?.length ?? 0}개 중 ${completions.data?.length ?? 0}개 완료`}
              </Text>
            )}
          </View>
          <AppIcon name="chevron-right" size={iconSizes.md} className={recordChevronClass} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(sober ? `/sober/${sober.id}` : '/sober')}
        className={recordCardClass}
      >
        <View className={recordIconContainerClass}>
          {sober ? (
            <SoberIcon name={sober.icon_key} colorKey={sober.icon_color} size={appRem * 2.25} />
          ) : (
            <AppIcon name="sober" size={appRem * 2.25} className={recordIconClass} />
          )}
        </View>
        <View className={recordContentClass}>
          {sober ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className={`min-w-0 flex-1 ${recordTitleClass}`}
              style={recordTextStyle}
            >
              {sober.name}
            </Text>
          ) : null}
          {soberPending ? (
            <View accessibilityLabel="거리두기 확인 중" className={recordLoadingClass} />
          ) : (
            <Text className={recordStatusClass} style={recordTextStyle}>
              {soberError
                ? '기록을 불러오지 못했어요.'
                : soberDays !== null
                  ? `거리를 두고 지낸 지 ${soberDays}일째예요.`
                  : '잠시 거리두기를 시작해보세요.'}
            </Text>
          )}
        </View>
        <AppIcon name="chevron-right" size={iconSizes.md} className={recordChevronClass} />
      </Pressable>
    </View>
  );
}
