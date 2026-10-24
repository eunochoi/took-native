import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppIcon } from '../../components/AppIcon';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import { habitProgressBand } from '../../domain/calendar';
import { EMOTIONS } from '../../domain/constants';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { RECORD_SURFACE_CLASS_NAME } from '../../theme/classes';

const cardClass = `${RECORD_SURFACE_CLASS_NAME} aspect-square shrink-0 items-center gap-2 p-3.5 ios:curve-continuous rounded-2xl active:opacity-70`;
const titleClass = 'w-full text-center text-sm leading-5 font-semibold text-theme-text-secondary';
const statusClass = 'w-full text-center text-sm leading-5 text-theme-text-secondary';
const loadingClass = 'h-5 w-3/4 rounded-lg bg-theme-skeleton';

type SummaryCardProps = {
  size: number;
  pending: boolean;
  error: boolean;
  onPress: () => void;
};

export function DiarySummaryCard({
  size,
  pending,
  error,
  emotion,
  onPress,
}: SummaryCardProps & { emotion: number | null }) {
  const { rem: appRem } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const visualSize = Math.min(
    appRem * 4.5,
    size * 0.42,
    Math.max(0, size - appRem * (2.5 + 2.5 * fontScale)),
  );
  const status = error
    ? '불러오기 실패'
    : emotion === null
      ? '기록 없음'
      : `'${EMOTIONS[emotion].name}' 기록 남김`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`오늘의 감정 일기 이동, ${pending ? '확인 중' : status}`}
      accessibilityState={{ disabled: pending || error }}
      disabled={pending || error}
      onPress={onPress}
      className={cardClass}
      style={{ width: size }}
    >
      <Text numberOfLines={1} className={titleClass}>
        일기
      </Text>
      <View
        className="flex-1 min-h-0 w-full items-center justify-center gap-1"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {pending ? (
          <View
            className="aspect-square rounded-full bg-theme-skeleton"
            style={{ width: visualSize }}
          />
        ) : !error && emotion !== null ? (
          <EmotionImage emotion={emotion} size={visualSize} iconStyle="basic" />
        ) : (
          <AppIcon
            name="diary"
            size={Math.min(appRem * 2, visualSize)}
            className="text-theme-text-disabled"
          />
        )}
        {pending ? (
          <View accessibilityLabel="일기 확인 중" className={loadingClass} />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            className={statusClass}
          >
            {status}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function HabitSummaryCard({
  size,
  pending,
  error,
  completed,
  total,
  freeRecords,
  onPress,
}: SummaryCardProps & { completed: number; total: number; freeRecords: number | null }) {
  const { colors, rem: appRem } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const visualSize = Math.min(
    appRem * 5,
    size * 0.46,
    Math.max(0, size - appRem * (2.5 + 2.5 * fontScale)),
  );
  const stroke = visualSize * 0.09;
  const radius = (visualSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const progressBand = habitProgressBand(progress * 100);
  const progressColor =
    progressBand === 'high'
      ? colors.progressHigh
      : progressBand === 'medium'
        ? colors.progressMedium
        : progressBand === 'low'
          ? colors.progressLow
          : colors.border;
  const status = error
    ? '불러오기 실패'
    : total === 0
      ? freeRecords !== null
        ? `${freeRecords}건 자유 기록`
        : '습관을 추가해 보세요'
      : completed === total
        ? '완료'
        : completed > 0
          ? `${Math.min(99, Math.max(1, Math.round(progress * 100)))}%`
          : '오늘도 하나씩';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`오늘의 습관 이동, ${pending ? '확인 중' : error ? status : `${completed}/${total} 완료, ${status}`}`}
      onPress={onPress}
      className={cardClass}
      style={{ width: size }}
    >
      <Text numberOfLines={1} className={titleClass}>
        습관
      </Text>
      <View
        className="flex-1 min-h-0 w-full items-center justify-center gap-1"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {pending ? (
          <View
            accessibilityLabel="습관 확인 중"
            className="aspect-square rounded-full bg-theme-skeleton"
            style={{ width: visualSize }}
          />
        ) : error ? (
          <AppIcon
            name="habit"
            size={Math.min(appRem * 2, visualSize)}
            className="text-theme-text-disabled"
          />
        ) : (
          <View
            className="items-center justify-center"
            style={{ width: visualSize, height: visualSize }}
          >
            <View className="absolute inset-0" pointerEvents="none">
              <Svg width={visualSize} height={visualSize} accessible={false}>
                <Circle
                  cx={visualSize / 2}
                  cy={visualSize / 2}
                  r={radius}
                  fill="none"
                  stroke={progressColor}
                  strokeOpacity={0.15}
                  strokeWidth={stroke}
                />
                {progress > 0 && (
                  <Circle
                    cx={visualSize / 2}
                    cy={visualSize / 2}
                    r={radius}
                    fill="none"
                    stroke={progressColor}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={[circumference, circumference]}
                    strokeDashoffset={circumference * (1 - progress)}
                    rotation={-90}
                    origin={`${visualSize / 2}, ${visualSize / 2}`}
                  />
                )}
              </Svg>
            </View>
            <Text className="w-full text-center text-base leading-6 font-semibold text-theme-text-primary">
              {`${completed}/${total}`}
            </Text>
          </View>
        )}
        {pending ? (
          <View className={loadingClass} />
        ) : (
          <Text numberOfLines={1} className={statusClass}>
            {status}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function DistanceSummaryCard({
  size,
  pending,
  error,
  days,
  name,
  onPress,
}: SummaryCardProps & { days: number | null; name?: string }) {
  const status = error ? '불러오기 실패' : (name ?? '기록 없음');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`거리두기 이동, ${pending ? '확인 중' : error ? status : days === null ? status : `${name}, ${days}일차`}`}
      onPress={onPress}
      className={cardClass}
      style={{ width: size }}
    >
      <Text numberOfLines={1} className={titleClass}>
        거리두기
      </Text>
      <View className="flex-1 min-h-0 w-full items-center justify-center gap-1">
        {pending ? (
          <View className="h-9 w-3/4 rounded-lg bg-theme-skeleton" />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            className="w-full text-center text-4xl leading-tight font-bold text-theme-home-distance"
          >
            {!error && days !== null ? `${days}일차` : '—'}
          </Text>
        )}
        {pending ? (
          <View accessibilityLabel="거리두기 확인 중" className={loadingClass} />
        ) : (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            className={statusClass}
          >
            {status}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function ArchiveSummaryCard({ size, onPress }: Pick<SummaryCardProps, 'size' | 'onPress'>) {
  const { rem: appRem } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="기록 분석 보기, 쌓인 기록의 흐름 확인"
      onPress={onPress}
      className={cardClass}
      style={{ width: size }}
    >
      <Text numberOfLines={1} className={titleClass}>
        기록 분석
      </Text>
      <View className="flex-1 min-h-0 w-full items-center justify-center gap-1">
        <AppIcon
          name="description"
          size={Math.min(appRem * 2.5, size * 0.3)}
          className="text-theme-accent"
        />
        <Text numberOfLines={1} className={statusClass}>
          쌓인 기록의 흐름
        </Text>
        <Text numberOfLines={1} className="text-sm leading-5 font-semibold text-theme-accent">
          분석 보기 →
        </Text>
      </View>
    </Pressable>
  );
}
