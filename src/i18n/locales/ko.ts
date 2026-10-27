import { widgetKo } from './ko/widget';
import { notificationsKo } from './ko/notifications';
import { errorsKo } from './ko/errors';
import { privacyKo } from './ko/privacy';
import { statsKo } from './ko/stats';
import { soberCategoriesKo } from './ko/soberCategories';
import { soberIconsKo } from './ko/soberIcons';
import { soberKo } from './ko/sober';
import { habitCategoriesKo } from './ko/habitCategories';
import { iconColorsKo } from './ko/iconColors';
import { habitIconsKo } from './ko/habitIcons';
import { habitKo } from './ko/habit';
import { diaryKo } from './ko/diary';
import { emotionsKo } from './ko/emotions';
import { calendarKo } from './ko/calendar';
import { onboardingKo } from './ko/onboarding';
import { homeKo } from './ko/home';
import { uiKo } from './ko/ui';
import { settingsKo } from './ko/settings';
import type { Translations } from './en';

export const ko = {
  widget: widgetKo,
  notifications: notificationsKo,
  errors: errorsKo,
  privacy: privacyKo,
  habitIcons: habitIconsKo,
  iconColors: iconColorsKo,
  habitCategories: habitCategoriesKo,
  stats: statsKo,
  sober: soberKo,
  soberIcons: soberIconsKo,
  soberCategories: soberCategoriesKo,
  habit: habitKo,
  diary: diaryKo,
  home: homeKo,
  onboarding: onboardingKo,
  calendar: calendarKo,
  emotions: emotionsKo,
  ui: uiKo,
  navigation: {
    index: '홈',
    calendar: '월간 기록',
    diary: '일기 목록',
    habit: '습관 관리',
    sober: '거리두기',
    setting: '설정',
    mainMenu: '주요 메뉴',
  },
  settings: settingsKo,
  language: {
    title: '언어',
    system: '시스템',
  },
  common: {
    confirm: '확인',
    cancel: '취소',
    save: '저장',
    delete: '삭제',
    edit: '수정',
    close: '닫기',
    done: '완료',
    apply: '적용',
    next: '다음',
    previous: '이전',
    retry: '다시 시도',
    retryMessage: '다시 시도해주세요.',
    loading: '불러오는 중…',
    saving: '저장 중…',
    selectedCount: '%{count}개 선택',
    dayCount: {
      other: '%{count}일',
    },
  },
} satisfies Translations;
