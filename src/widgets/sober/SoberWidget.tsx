import Ionicons from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import { FlexWidget, IconWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import type { Sober, SoberRestart } from '../../db/types';
import {
  SOBER_ICONS,
  formatSoberDuration,
  formatSoberGoal,
  getSoberSummary,
} from '../../domain/sober';
import { ACCENT_PALETTES } from '../../theme/colors';
import tokens from '../../theme/tokens.json';
import type { SoberWidgetSettings } from './model';

export function SoberWidget({
  settings,
  sober,
  restarts = [],
  width,
  height,
  now = Date.now(),
}: {
  settings: SoberWidgetSettings | null;
  sober: Sober | null;
  restarts?: SoberRestart[];
  width: number;
  height: number;
  now?: number;
}) {
  'use no memo';
  const scale = Math.min(width, height) / 180;
  const accent = ACCENT_PALETTES[settings?.accent ?? 'blue'].accent as `#${string}`;
  const text = (
    settings?.textColor === 'white' ? tokens.colorValues.white : tokens.colorValues.lightTextPrimary
  ) as `#${string}`;
  const background =
    settings?.background === 'transparent'
      ? '#ffffff00'
      : settings?.background === 'black'
        ? '#000000'
        : '#FFFFFF';
  const summary = sober ? getSoberSummary(sober, restarts, now) : null;
  const label =
    sober && summary
      ? `${sober.name}, ${formatSoberDuration(summary.duration)}, 목표 ${formatSoberGoal(summary.goalDays)}, ${summary.progress.toFixed(1)}%`
      : '절제 타이머를 선택해주세요';
  const textStyle = { color: text, fontFamily: 'TmoneyRoundWindRegular', fontSize: 12 * scale };
  const boldStyle = {
    ...textStyle,
    fontFamily: 'TmoneyRoundWindExtraBold',
    fontSize: 16 * scale,
    adjustsFontSizeToFit: true,
  };
  const icon = SOBER_ICONS[sober?.icon_key ?? 'favorite'];
  const glyph =
    icon.family === 'badge'
      ? '19'
      : String.fromCodePoint(
          (
            (icon.family === 'ionicons' ? Ionicons : MaterialCommunityIcons) as Record<
              string,
              number
            >
          )[icon.name],
        );
  const trackWidth = Math.max(0, width - 32 * scale);
  const trackHeight = 12 * scale;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: background,
        borderRadius: 24,
        paddingHorizontal: 16 * scale,
        paddingVertical: 14 * scale,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      accessibilityLabel={label}
      clickAction={sober ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={sober ? { uri: `took-local://sober/${sober.id}` } : undefined}
    >
      <FlexWidget style={{ alignItems: 'center', flexGap: 7 * scale }}>
        <FlexWidget
          style={{
            width: 44 * scale,
            height: 44 * scale,
            borderRadius: 22 * scale,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon.family === 'badge' ? (
            <TextWidget
              text="19"
              style={{ ...boldStyle, color: '#FFFFFF', fontSize: 22 * scale }}
            />
          ) : (
            <IconWidget
              icon={glyph}
              font={icon.family === 'ionicons' ? 'Ionicons' : 'MaterialCommunityIcons'}
              size={28 * scale}
              style={{ color: '#FFFFFF' }}
            />
          )}
        </FlexWidget>
        <TextWidget
          text={sober?.name ?? '절제 타이머'}
          maxLines={1}
          truncate="END"
          style={{ color: text, textAlign: 'center', fontSize: 16 * scale, width: trackWidth }}
        />
      </FlexWidget>
      {summary ? (
        <FlexWidget style={{ width: 'match_parent', flexGap: 6 * scale }}>
          <TextWidget
            text={formatSoberDuration(summary.duration)}
            maxLines={1}
            style={{ ...boldStyle, fontSize: 18 * scale, textAlign: 'center', width: trackWidth }}
          />
          <OverlapWidget
            style={{
              width: trackWidth,
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: '#EBEBEB',
              overflow: 'hidden',
            }}
          >
            <FlexWidget
              style={{
                width: (trackWidth * summary.progress) / 100,
                height: trackHeight,
                backgroundColor: accent,
              }}
            />
          </OverlapWidget>
          <FlexWidget
            style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <TextWidget
              text={`목표 ${formatSoberGoal(summary.goalDays)}`}
              style={{ ...textStyle, paddingLeft: 2 }}
            />
            <TextWidget
              text={`${summary.progress.toFixed(1)}%`}
              style={{ ...textStyle, paddingRight: 4 }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <TextWidget
          text={
            settings
              ? '항목이 없어요. 위젯 설정에서 다시 선택해주세요.'
              : '위젯 설정에서 항목을 선택해주세요.'
          }
          style={{ ...textStyle, textAlign: 'center' }}
        />
      )}
    </FlexWidget>
  );
}
