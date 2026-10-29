import { translateErrorMessage } from '../src/i18n/errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import { mockI18n } from './helpers/i18n';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any, type: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
function harness(file: string, dependencies: Record<string, unknown> = {}) {
  let language: 'ko' | 'en' = 'ko';
  const exports: any = {};
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Pressable: 'Pressable', ActivityIndicator: 'Spinner' },
    '../../components/InfoNotice': { InfoNotice: 'InfoNotice' },
    '../../components/AppIcon': { AppIcon: 'Icon' },
    './AutomaticBackupSection': { AutomaticBackupSection: 'AutoBackup' },
    '../../components/Text': { Text: 'Text' },
    '../../i18n/react': mockI18n(() => language),
    '../../i18n/errors': { translateErrorMessage },
    '../../theme/AppThemeProvider': { useAppTheme: () => ({ rem: 15, colors: {}, iconSizes: {} }) },
    '../../theme/classes': {},
    ...dependencies,
  };
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/screens/settings/${file}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/i18n/errors')) return { translateErrorMessage };
        assert(name in modules, `Unexpected dependency: ${name}`);
        return modules[name as keyof typeof modules];
      },
    },
  );
  return {
    component: exports[file],
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
  };
}

test('backup guidance and destination choices switch languages while preserving actions and busy guards', () => {
  const ui = harness('BackupSection');
  let exports = 0;
  let restores = 0;
  const render = (activity: 'export' | 'restore' | null = null) =>
    ui.component({ activity, onExport: () => exports++, onRestore: () => restores++ });
  assert(nodes(render(), 'Text').some((node) => node.props.children === '백업 / 복원'));
  ui.setLanguage('en');
  const english = render();
  const text = nodes(english, 'Text')
    .map((node) => node.props.children)
    .join(' ');
  assert(text.includes('Backup / Restore'));
  assert(text.includes('Back up now'));
  assert(text.includes('Restore from file'));

  assert(!/[가-힣]/.test(text));
  nodes(english, 'Pressable')[0].props.onPress();
  nodes(english, 'Pressable')[1].props.onPress();
  assert.equal(exports, 1);
  assert.equal(restores, 1);
  for (const activity of ['export', 'restore'] as const) {
    assert(nodes(render(activity), 'Pressable').every((node) => node.props.disabled));
    assert(
      nodes(render(activity), 'Text').some((node) =>
        String(node.props.children).includes('Back up'),
      ),
    );
  }
  ui.setLanguage('ko');
  assert(nodes(render(), 'Text').some((node) => node.props.children === '백업 / 복원'));

  const destinations = harness('BackupDestinationPicker', {
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    '../../components/PickerAction': { PickerAction: 'Action' },
  });
  destinations.setLanguage('en');
  const selected: string[] = [];
  const modal = destinations.component({
    onClose: () => {},
    onSelect: (value: string) => selected.push(value),
  });
  assert.equal(modal.props.title, 'Where to save your backup?');
  const choices = nodes(
    modal.props.children((afterClose: () => void) => afterClose()),
    'Action',
  );
  assert.deepEqual(
    choices.map((node) => node.props.title),
    ['Save to device', 'Share to another app'],
  );
  for (const choice of choices) choice.props.onPress();
  assert.deepEqual(selected, ['device', 'share']);
});

test('reminder titles, times, accessibility labels and open picker react to language changes', () => {
  let selected: string | null = null;
  const keys = ['diaryReminderTime', 'habitReminderTime', 'soberReminderTime'];
  const ui = harness('NotificationSettingsSection', {
    react: {
      useState: () => [
        selected,
        (value: string) => {
          selected = value;
        },
      ],
    },
    '../../notifications': { REMINDERS: keys.map((key) => ({ key })), saveReminder: () => {} },
    '../../settings/SettingsProvider': {
      useSettings: () => ({
        settings: { ...DEFAULT_SETTINGS, habitReminderTime: '00:05', soberReminderTime: '13:30' },
        updateSettings: () => {},
      }),
    },
    './NotificationTimePicker': { NotificationTimePicker: 'Picker' },
  });
  ui.setLanguage('en');
  const tree = ui.component({ disabled: false });
  assert.deepEqual(
    nodes(tree, 'Pressable').map((node) => node.props.children.props.children),
    ['Not set', '12:05 AM', '1:30 PM'],
  );
  assert(nodes(tree, 'Pressable').every((node) => !/[가-힣]/.test(node.props.accessibilityLabel)));
  nodes(tree, 'Pressable')[1].props.onPress();
  assert.equal(nodes(ui.component({ disabled: false }), 'Picker')[0].props.title, 'Habit reminder');
  ui.setLanguage('ko');
  assert.equal(nodes(ui.component({ disabled: false }), 'Picker')[0].props.title, '습관 실천 알림');
  assert(nodes(ui.component({ disabled: true }), 'Pressable').every((node) => node.props.disabled));
});

test('emotion style labels switch languages without changing persisted style values', () => {
  const ui = harness('EmotionIconStyleSelector', {
    'tailwind-merge': { twMerge: (...values: unknown[]) => values.filter(Boolean).join(' ') },
    '../../components/EmotionImage': { EmotionImage: 'Emotion' },
  });
  const changes: string[] = [];
  const props = {
    value: 'simple',
    disabled: false,
    onChange: (value: string) => changes.push(value),
  };
  ui.setLanguage('en');
  const tree = ui.component(props);
  assert.equal(tree.props.accessibilityLabel, 'Emotion icon style');
  assert.deepEqual(
    nodes(tree, 'Pressable').map((node) => node.props.accessibilityLabel),
    ['Basic', 'Simple', 'Emoji'],
  );
  for (const option of nodes(tree, 'Pressable')) option.props.onPress();
  assert.deepEqual(changes, ['basic', 'simple', 'emoji']);
  ui.setLanguage('ko');
  assert.deepEqual(
    nodes(ui.component(props), 'Pressable').map((node) => node.props.accessibilityLabel),
    ['기본형', '단순형', '이모지'],
  );
});

test('English time picker labels and validation stay English when rejecting invalid input', () => {
  const state: any[] = [];
  let cursor = 0;
  const ui = harness('NotificationTimePicker', {
    react: {
      useState: (initial: unknown) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value: unknown) => {
            state[index] = value;
          },
        ];
      },
      useRef: (initial: unknown) => {
        const index = cursor++;
        return state[index] ?? (state[index] = { current: initial });
      },
    },
    'react-native': { View: 'View', TextInput: 'Input' },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    '../../components/Button': { Button: 'Button' },
  });
  ui.setLanguage('en');
  const render = () => {
    cursor = 0;
    return ui.component({
      title: 'Diary reminder',
      value: '21:00',
      onClose: () => {},
      onApply: () => {
        assert.fail('Invalid time must not be saved');
      },
    });
  };
  let modal = render();
  assert.equal(modal.props.footer(() => {}).props.label, 'Save');
  const body = modal.props.children(() => {});
  assert.deepEqual(
    nodes(body, 'Input').map((node) => node.props.accessibilityLabel),
    ['Hour (0–23)', 'Minute (0–59)'],
  );
  assert.equal(nodes(body, 'Button')[0].props.label, 'Turn off reminder');
  nodes(body, 'Input')[0].props.onChangeText('24');
  render()
    .props.footer(() => {})
    .props.onPress();
  modal = render();
  assert(
    nodes(
      modal.props.children(() => {}),
      'Text',
    ).some(
      (node) => node.props.children === 'Enter an hour from 0 to 23 and a minute from 0 to 59.',
    ),
  );
});

test('reminder clock labels distinguish midnight, noon and the last minute without changing HH:mm settings', () => {
  const settings = { ...DEFAULT_SETTINGS };
  const ui = harness('NotificationSettingsSection', {
    react: { useState: () => [null, () => {}] },
    '../../notifications': { REMINDERS: [{ key: 'diaryReminderTime' }], saveReminder: () => {} },
    '../../settings/SettingsProvider': {
      useSettings: () => ({ settings, updateSettings: () => {} }),
    },
    './NotificationTimePicker': { NotificationTimePicker: 'Picker' },
  });
  for (const [time, korean, english] of [
    ['00:00', '오전 12:00', '12:00 AM'],
    ['00:05', '오전 12:05', '12:05 AM'],
    ['12:00', '오후 12:00', '12:00 PM'],
    ['12:05', '오후 12:05', '12:05 PM'],
    ['23:59', '오후 11:59', '11:59 PM'],
  ]) {
    settings.diaryReminderTime = time;
    for (const [language, expected] of [
      ['ko', korean],
      ['en', english],
    ] as const) {
      ui.setLanguage(language);
      const button = nodes(ui.component({ disabled: false }), 'Pressable')[0];
      assert.equal(button.props.children.props.children, expected);
      assert(button.props.accessibilityLabel.includes(expected));
      assert.equal(settings.diaryReminderTime, time);
    }
  }
});

test('automatic backup switch follows configured, paused and busy states and opens password setup before activation', () => {
  let status = {
    enabled: false,
    configured: false,
    paused: false,
    pending: false,
    lastSuccess: undefined as string | undefined,
  };
  let busy = false;
  let disabled = 0;
  const stateChanges: unknown[] = [];
  const ui = harness('AutomaticBackupSection', {
    react: {
      useEffect: () => {},
      useState: (initial: unknown) => [initial, (value: unknown) => stateChanges.push(value)],
      useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    },
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      Switch: 'Switch',
      Platform: { OS: 'ios' },
    },
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../backup': { latestSafetyBackup: () => null, shareSafetyBackup: async () => {} },
    '../../backup/automatic': {
      autoBackupStatus: () => status,
      subscribeAutoBackup: () => {},
      refreshAutoBackupStatus: async () => {},
      configureAutomaticBackup: async () => {},
      disableAutomaticBackup: async () => {
        disabled++;
      },
      resumeAutomaticBackup: async () => {},
      runAutomaticBackup: async () => {},
    },
    '../../backup/operation': { backupBusy: () => busy, subscribeBackupActivity: () => {} },
    '../../backup/errors': { backupErrorMessage: String },
    '../../components/Button': { Button: 'Button' },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    './BackupPasswordSheet': { BackupPasswordSheet: 'Password' },
  });
  const render = () => ui.component({ disabled: false });
  nodes(render(), 'Switch')[0].props.onValueChange(true);
  assert(stateChanges.includes(true));
  assert.equal(disabled, 0);
  status = { ...status, enabled: true, configured: true, lastSuccess: '2026-10-28T12:00:00Z' };
  assert.equal(nodes(render(), 'Switch')[0].props.value, true);
  nodes(render(), 'Switch')[0].props.onValueChange(false);
  assert.equal(disabled, 1);
  status = { ...status, enabled: false };
  assert(nodes(render(), 'Text').some((node) => String(node.props.children).includes('2026')));
  status = { ...status, enabled: true, paused: true };
  assert.equal(nodes(render(), 'Switch')[0].props.value, false);
  busy = true;
  assert.equal(nodes(render(), 'Switch')[0].props.disabled, true);
});
