import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { Sober, SoberRestart } from '../../db/types';
import { isHabitIconColor, resolveIconColor } from '../../domain/constants';
import { formatSoberDuration, formatSoberGoal, getSoberSummary } from '../../domain/sober';
import { ACCENT_PALETTES } from '../../theme/colors';
import type { Settings } from '../../settings/model';
import tokens from '../../theme/tokens.json';
import type { SoberWidgetSettings } from './model';
import icons from './icons.json';

export function SoberWidget({
  settings,
  sober,
  restarts = [],
  themeAccent = 'blue',
  width,
  height,
  now = Date.now(),
}: {
  settings: SoberWidgetSettings | null;
  sober: Sober | null;
  restarts?: SoberRestart[];
  themeAccent?: Settings['themeAccent'];
  width: number;
  height: number;
  now?: number;
}) {
  'use no memo';
  const scale = Math.min(width, height) / 180;
  const accent = resolveIconColor(
    isHabitIconColor(sober?.icon_color) ? sober.icon_color : 'theme',
    (ACCENT_PALETTES[themeAccent] ?? ACCENT_PALETTES.blue).accent,
  ) as `#${string}`;
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
      : '표시할 거리두기를 선택해주세요.';
  const textStyle = { color: text, fontFamily: 'TmoneyRoundWindRegular', fontSize: 12 * scale };
  const boldStyle = {
    ...textStyle,
    fontFamily: 'TmoneyRoundWindExtraBold',
    fontSize: 16 * scale,
    adjustsFontSizeToFit: true,
  };
  const icon = icons[sober?.icon_key ?? 'favorite'].replaceAll('currentColor', accent);
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
      clickAction="OPEN_URI"
      clickActionData={{ uri: sober ? `pawpaw-took://sober/${sober.id}` : 'pawpaw-took://sober' }}
    >
      <FlexWidget style={{ alignItems: 'center', flexGap: 7 * scale }}>
        <FlexWidget
          style={{
            width: 44 * scale,
            height: 44 * scale,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget svg={icon} style={{ width: 28 * scale, height: 28 * scale }} />
        </FlexWidget>
        <TextWidget
          text={sober ? sober.name : '거리두기'}
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
            style={{ ...boldStyle, fontSize: 17 * scale, textAlign: 'center', width: trackWidth }}
          />
          <OverlapWidget
            style={{
              width: trackWidth,
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: tokens.colorValues.lightBorderMuted as `#${string}`,
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
              ? '선택한 거리두기 항목이 없어요. 위젯 설정에서 다시 선택해주세요.'
              : '위젯 설정에서 거리두기를 선택해주세요.'
          }
          style={{ ...textStyle, textAlign: 'center' }}
        />
      )}
    </FlexWidget>
  );
}
