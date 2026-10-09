export interface Settings {
  themeAccent: 'blue' | 'green' | 'purple' | 'pink' | 'yellow' | 'grey';
  themeMode: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'normal' | 'large';
  emotionStyle: 'basic' | 'simple' | 'emoji';
  diarySort: 'ASC' | 'DESC';
  habitSort: 'ASC' | 'DESC' | 'CUSTOM';
  habitPriorityFirst: boolean;
  habitOrder: number[];
  soberSort: 'ASC' | 'DESC';
  soberPriorityFirst: boolean;
  diaryReminderTime: string | null;
  habitReminderTime: string | null;
  soberReminderTime: string | null;
}
export const DEFAULT_SETTINGS: Settings = {
  themeAccent: 'blue',
  themeMode: 'light',
  fontSize: 'normal',
  emotionStyle: 'basic',
  diarySort: 'DESC',
  habitSort: 'DESC',
  habitPriorityFirst: false,
  habitOrder: [],
  soberSort: 'DESC',
  soberPriorityFirst: false,
  diaryReminderTime: null,
  habitReminderTime: null,
  soberReminderTime: null,
};
export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('앱 설정 파일이 손상되었습니다.');
  const value = raw as Record<string, unknown>;
  const settings = { ...DEFAULT_SETTINGS, ...value };
  if (
    !['blue', 'green', 'purple', 'pink', 'yellow', 'grey'].includes(settings.themeAccent) ||
    !['light', 'dark', 'system'].includes(settings.themeMode) ||
    !['small', 'normal', 'large'].includes(settings.fontSize) ||
    !['basic', 'simple', 'emoji'].includes(settings.emotionStyle) ||
    !['ASC', 'DESC'].includes(settings.diarySort) ||
    !['ASC', 'DESC', 'CUSTOM'].includes(settings.habitSort) ||
    typeof settings.habitPriorityFirst !== 'boolean' ||
    !['ASC', 'DESC'].includes(settings.soberSort) ||
    typeof settings.soberPriorityFirst !== 'boolean' ||
    [settings.diaryReminderTime, settings.habitReminderTime, settings.soberReminderTime].some(
      (time) =>
        time !== null && (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)),
    ) ||
    !Array.isArray(settings.habitOrder) ||
    settings.habitOrder.length > 10000 ||
    settings.habitOrder.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
    new Set(settings.habitOrder).size !== settings.habitOrder.length
  ) {
    throw new Error('앱 설정을 읽을 수 없습니다.');
  }
  return {
    themeAccent: settings.themeAccent,
    themeMode: settings.themeMode,
    fontSize: settings.fontSize,
    emotionStyle: settings.emotionStyle,
    diarySort: settings.diarySort,
    habitSort: settings.habitSort,
    habitPriorityFirst: settings.habitPriorityFirst,
    habitOrder: settings.habitOrder,
    soberSort: settings.soberSort,
    soberPriorityFirst: settings.soberPriorityFirst,
    diaryReminderTime: settings.diaryReminderTime,
    habitReminderTime: settings.habitReminderTime,
    soberReminderTime: settings.soberReminderTime,
  };
}
