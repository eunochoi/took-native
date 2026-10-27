import { widgetEn } from './en/widget';
import { notificationsEn } from './en/notifications';
import { errorsEn } from './en/errors';
import { privacyEn } from './en/privacy';
import { statsEn } from './en/stats';
import { soberCategoriesEn } from './en/soberCategories';
import { soberIconsEn } from './en/soberIcons';
import { soberEn } from './en/sober';
import { habitCategoriesEn } from './en/habitCategories';
import { iconColorsEn } from './en/iconColors';
import { habitIconsEn } from './en/habitIcons';
import { habitEn } from './en/habit';
import { diaryEn } from './en/diary';
import { emotionsEn } from './en/emotions';
import { calendarEn } from './en/calendar';
import { onboardingEn } from './en/onboarding';
import { homeEn } from './en/home';
import { uiEn } from './en/ui';
import { settingsEn } from './en/settings';
export const en = {
  widget: widgetEn,
  notifications: notificationsEn,
  errors: errorsEn,
  privacy: privacyEn,
  habitIcons: habitIconsEn,
  iconColors: iconColorsEn,
  habitCategories: habitCategoriesEn,
  stats: statsEn,
  sober: soberEn,
  soberIcons: soberIconsEn,
  soberCategories: soberCategoriesEn,
  habit: habitEn,
  diary: diaryEn,
  home: homeEn,
  onboarding: onboardingEn,
  calendar: calendarEn,
  emotions: emotionsEn,
  ui: uiEn,
  navigation: {
    index: 'Home',
    calendar: 'Calendar',
    diary: 'Diary',
    habit: 'Habits',
    sober: 'Cut Back',
    setting: 'Settings',
    mainMenu: 'Main menu',
  },
  settings: settingsEn,
  language: {
    title: 'Language',
    system: 'System',
  },
  common: {
    confirm: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    done: 'Done',
    apply: 'Apply',
    next: 'Next',
    previous: 'Previous',
    retry: 'Try again',
    retryMessage: 'Please try again.',
    loading: 'Loading…',
    saving: 'Saving…',
    selectedCount: '%{count} selected',
    dayCount: {
      one: '%{count} day',
      other: '%{count} days',
    },
  },
} as const;

export type Translations = {
  [Section in keyof typeof en]: {
    [Key in keyof (typeof en)[Section]]: (typeof en)[Section][Key] extends string
      ? string
      : { one?: string; other: string };
  };
};
