import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any, type: string): any[] {
  if (!tree || typeof tree !== 'object') return [];
  return [
    ...(tree.type === type ? [tree] : []),
    ...[tree.props?.children].flat().flatMap((child) => nodes(child, type)),
  ];
}

function load(path: string, dependencies: Record<string, unknown>) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      Error,
      require: (name: string) => {
        assert(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}

function harness() {
  let permission = { granted: true, canAskAgain: true };
  const scheduled = new Map<string, any>();
  const events: string[] = [];
  let failSchedule = false;
  let grant = true;
  const native = {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
    setNotificationChannelAsync: async (_id: string, options: any) => {
      assert.equal(
        Object.hasOwn(options, 'sound'),
        false,
        'Use the system default channel sound without a custom filename',
      );
      events.push('channel');
    },
    getPermissionsAsync: async () => permission,
    requestPermissionsAsync: async () => {
      events.push('permission');
      permission = { ...permission, granted: grant };
      return permission;
    },
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async (id: string) => {
      events.push(`cancel:${id}`);
      scheduled.delete(id);
    },
    scheduleNotificationAsync: async (notification: any) => {
      events.push(`schedule:${notification.identifier}`);
      if (failSchedule) {
        failSchedule = false;
        throw new Error('schedule failed');
      }
      scheduled.set(notification.identifier, notification);
      return notification.identifier;
    },
  };
  const service = load('../src/notifications/index.ts', { 'expo-notifications': native });
  return {
    service,
    scheduled,
    events,
    deny: (canAskAgain = true) => {
      permission = { granted: false, canAskAgain };
    },
    grant: (value: boolean) => {
      grant = value;
    },
    failSchedule: () => {
      failSchedule = true;
    },
  };
}

test('reminder settings default to off and validate times on backup restore', () => {
  const old = { ...DEFAULT_SETTINGS } as any;
  delete old.diaryReminderTime;
  delete old.habitReminderTime;
  delete old.soberReminderTime;
  assert.deepEqual(parseSettings(old), DEFAULT_SETTINGS);
  for (const time of ['00:00', '23:59', '12:30']) {
    assert.equal(parseSettings({ ...old, diaryReminderTime: time }).diaryReminderTime, time);
  }
  for (const key of ['diaryReminderTime', 'habitReminderTime', 'soberReminderTime']) {
    for (const value of ['24:00', '12:60', '9:00', '', 900, undefined]) {
      assert.throws(() => parseSettings({ ...old, [key]: value }));
    }
  }
});

test('three independent daily reminders include local time, channel and destination', async () => {
  const h = harness();
  await h.service.syncReminders({
    ...DEFAULT_SETTINGS,
    diaryReminderTime: '00:00',
    habitReminderTime: '12:30',
    soberReminderTime: '23:59',
  });
  assert.equal(h.scheduled.size, 3);
  for (const [key, hour, minute, url] of [
    ['diaryReminderTime', 0, 0, '/diary'],
    ['habitReminderTime', 12, 30, '/habit'],
    ['soberReminderTime', 23, 59, '/sober'],
  ]) {
    const request = h.scheduled.get(`took-${key}`);
    assert.deepEqual(plain(request.trigger), {
      type: 'daily',
      hour,
      minute,
      channelId: 'daily-reminders',
    });
    assert.equal(request.content.data.url, url);
  }
});

test('startup and restore reconcile without duplicating or cancelling unrelated notifications', async () => {
  const h = harness();
  h.scheduled.set('other', { identifier: 'other' });
  const initial = { ...DEFAULT_SETTINGS, diaryReminderTime: '21:00' };
  await h.service.syncReminders(initial);
  h.events.length = 0;
  await h.service.syncReminders(initial);
  assert.equal(h.events.length, 0);
  await h.service.syncReminders({ ...DEFAULT_SETTINGS, habitReminderTime: '08:15' });
  assert.deepEqual([...h.scheduled.keys()], ['other', 'took-habitReminderTime']);
});

test('permission is requested only on save; rejected permission never persists or schedules', async () => {
  const h = harness();
  h.deny();
  h.grant(false);
  await h.service.syncReminders(DEFAULT_SETTINGS);
  assert(!h.events.includes('permission'));
  let persisted = false;
  await assert.rejects(
    h.service.saveReminder(DEFAULT_SETTINGS, 'diaryReminderTime', '21:00', async () => {
      persisted = true;
    }),
    /알림을 허용/,
  );
  assert.equal(persisted, false);
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.events[0], 'channel');
  h.events.length = 0;
  h.deny(false);
  await assert.rejects(
    h.service.saveReminder(DEFAULT_SETTINGS, 'diaryReminderTime', '21:00', async () => {}),
  );
  assert(!h.events.includes('permission'));
});

test('grant, edit and disable persist independently and replace the old reservation', async () => {
  const h = harness();
  h.deny();
  let settings = { ...DEFAULT_SETTINGS };
  const persist = async (patch: any) => {
    settings = { ...settings, ...patch };
  };
  await h.service.saveReminder(settings, 'diaryReminderTime', '21:00', persist);
  assert.equal(settings.diaryReminderTime, '21:00');
  await h.service.saveReminder(settings, 'diaryReminderTime', '08:30', persist);
  assert.equal(h.scheduled.size, 1);
  assert.equal(h.scheduled.get('took-diaryReminderTime').trigger.hour, 8);
  await h.service.saveReminder(settings, 'diaryReminderTime', null, persist);
  assert.equal(settings.diaryReminderTime, null);
  assert.equal(h.scheduled.size, 0);
});

test('failed reservation or persistence restores the previous reservation and queue recovers', async () => {
  for (const scheduleFailure of [true, false]) {
    const h = harness();
    const times = { ...DEFAULT_SETTINGS, diaryReminderTime: '21:00' };
    await h.service.syncReminders(times);
    if (scheduleFailure) h.failSchedule();
    let persisted = false;
    await assert.rejects(
      h.service.saveReminder(times, 'diaryReminderTime', '08:30', async () => {
        persisted = true;
        throw new Error('disk full');
      }),
    );
    assert.equal(persisted, !scheduleFailure);
    assert.equal(h.scheduled.get('took-diaryReminderTime').content.data.reminderTime, '21:00');
    await h.service.syncReminders(DEFAULT_SETTINGS);
    assert.equal(h.scheduled.size, 0);
  }
});

test('invalid saves have no effects and revoked permission cancels owned reminders', async () => {
  const h = harness();
  await assert.rejects(
    h.service.saveReminder(DEFAULT_SETTINGS, 'diaryReminderTime', '24:00', async () => {}),
  );
  assert.equal(h.events.length, 0);
  const times = { ...DEFAULT_SETTINGS, diaryReminderTime: '21:00' };
  await h.service.syncReminders(times);
  h.deny(false);
  await h.service.syncReminders(times);
  assert.equal(h.scheduled.size, 0);
  assert(!h.events.includes('permission'));
});

test('concurrent synchronization is serialized and the latest restored times win', async () => {
  const h = harness();
  await Promise.all([
    h.service.syncReminders({ ...DEFAULT_SETTINGS, diaryReminderTime: '21:00' }),
    h.service.syncReminders({ ...DEFAULT_SETTINGS, diaryReminderTime: '08:00' }),
    h.service.syncReminders(DEFAULT_SETTINGS),
  ]);
  assert.equal(h.scheduled.size, 0);
  assert.deepEqual(
    h.events.filter((event) => event.startsWith('schedule:') || event.startsWith('cancel:')),
    [
      'schedule:took-diaryReminderTime',
      'cancel:took-diaryReminderTime',
      'schedule:took-diaryReminderTime',
      'cancel:took-diaryReminderTime',
    ],
  );
});

test('settings display compact unset and AM/PM times and open the selected reminder', () => {
  const h = harness();
  let selected: any = null;
  const saves: any[] = [];
  const settings = { ...DEFAULT_SETTINGS, habitReminderTime: '00:05', soberReminderTime: '13:30' };
  const component = load('../src/screens/settings/NotificationSettingsSection.tsx', {
    react: {
      useState: () => [
        selected,
        (value: any) => {
          selected = value;
        },
      ],
    },
    'react-native': { View: 'View', Pressable: 'Pressable' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/Text': { Text: 'Text' },
    '../../notifications': {
      ...h.service,
      saveReminder: (...args: any[]) => {
        saves.push(args);
      },
    },
    '../../settings/SettingsProvider': {
      useSettings: () => ({ settings, updateSettings: () => {} }),
    },
    './NotificationTimePicker': { NotificationTimePicker: 'Picker' },
  }).NotificationSettingsSection;
  let tree = component({ disabled: false });
  assert.deepEqual(
    nodes(tree, 'Pressable').map((node) => node.props.children.props.children),
    ['미정', '오전 12:05', '오후 1:30'],
  );
  nodes(tree, 'Pressable')[1].props.onPress();
  tree = component({ disabled: false });
  const picker = nodes(tree, 'Picker')[0].props;
  assert.equal(picker.title, '습관 실천 알림');
  assert.equal(picker.value, '00:05');
  picker.onApply(null);
  assert.equal(saves[0][1], 'habitReminderTime');
  assert.equal(saves[0][2], null);
  assert(nodes(component({ disabled: true }), 'Pressable').every((node) => node.props.disabled));
});

test('time picker rejects invalid input, stays open on failure and closes after saving or disabling', async () => {
  const slots: any[] = [];
  let cursor = 0;
  let fail = true;
  let closes = 0;
  const applied: any[] = [];
  const component = load('../src/screens/settings/NotificationTimePicker.tsx', {
    react: {
      useState: (initial: any) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [
          slots[i],
          (value: any) => {
            slots[i] = value;
          },
        ];
      },
      useRef: (initial: any) => {
        const i = cursor++;
        return slots[i] ?? (slots[i] = { current: initial });
      },
    },
    'react-native': { View: 'View', TextInput: 'TextInput' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    '../../components/Button': { Button: 'Button' },
    '../../components/Text': { Text: 'Text' },
  }).NotificationTimePicker;
  function render() {
    cursor = 0;
    const modal = component({
      title: '일기 작성 알림',
      value: '21:00',
      onClose: () => {},
      onApply: async (time: any) => {
        applied.push(time);
        if (fail) throw new Error('예약 실패');
      },
    });
    return {
      modal,
      tree: jsx('Fragment', {
        children: [
          modal.props.children,
          modal.props.footer(() => {
            closes++;
          }),
        ],
      }),
    };
  }
  nodes(render().tree, 'TextInput')[0].props.onChangeText('24');
  nodes(render().tree, 'Button')[0].props.onPress();
  assert.equal(applied.length, 0);
  assert(nodes(render().tree, 'Text').some((node) => node.props.accessibilityRole === 'alert'));
  nodes(render().tree, 'TextInput')[0].props.onChangeText('9');
  nodes(render().tree, 'Button')[0].props.onPress();
  assert.equal(render().modal.props.onBeforeClose(), false);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(applied, ['09:00']);
  assert.equal(closes, 0);
  assert(nodes(render().tree, 'Text').some((node) => node.props.children === '예약 실패'));
  fail = false;
  nodes(render().tree, 'Button')[0].props.onPress();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(closes, 1);
  nodes(render().tree, 'Button')[1].props.onPress();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(applied.at(-1), null);
  assert.equal(closes, 2);
});

test('controller waits for navigation, routes notification taps and cleans up foreground listeners', async () => {
  let ready = false;
  const effects: (() => any)[] = [];
  const routes: string[] = [];
  const synced: any[] = [];
  const notices: any[] = [];
  let failSync = false;
  let foreground: any;
  let tapped: any;
  let removed = 0;
  let last: any = { notification: { request: { content: { data: { url: '/diary' } } } } };
  let handler: any;
  const component = load('../src/notifications/NotificationController.tsx', {
    react: {
      useEffect: (effect: any) => effects.push(effect),
      useRef: (value: any) => ({ current: value }),
    },
    'react-native': {
      Alert: { alert: (title: string, message: string) => notices.push({ title, message }) },
      AppState: {
        addEventListener: (_event: any, listener: any) => {
          foreground = listener;
          return {
            remove: () => {
              removed++;
            },
          };
        },
      },
    },
    'expo-router': {
      useRootNavigationState: () => (ready ? { key: 'ready' } : undefined),
      useRouter: () => ({ push: (url: string) => routes.push(url) }),
    },
    'expo-notifications': {
      setNotificationHandler: (value: any) => {
        handler = value;
      },
      getLastNotificationResponse: () => last,
      clearLastNotificationResponse: () => {
        last = null;
      },
      addNotificationResponseReceivedListener: (listener: any) => {
        tapped = listener;
        return {
          remove: () => {
            removed++;
          },
        };
      },
    },
    '../settings/SettingsProvider': { useSettings: () => ({ settings: DEFAULT_SETTINGS }) },
    './index': {
      REMINDERS: harness().service.REMINDERS,
      syncReminders: async (value: any) => {
        synced.push(value);
        if (failSync) throw new Error('예약 실패');
      },
    },
  }).NotificationController;
  component();
  const cleanups = effects
    .splice(0)
    .map((effect) => effect())
    .filter(Boolean);
  assert.deepEqual(routes, []);
  assert.equal(typeof tapped, 'undefined');
  assert.equal(synced.length, 1);
  foreground('background');
  foreground('active');
  assert.equal(synced.length, 2);
  cleanups.forEach((cleanup) => cleanup());
  ready = true;
  component();
  const nextCleanups = effects
    .splice(0)
    .map((effect) => effect())
    .filter(Boolean);
  assert.deepEqual(routes, ['/diary']);
  for (const url of ['/habit', '/sober', 'https://example.com']) {
    tapped({ notification: { request: { content: { data: { url } } } } });
  }
  assert.deepEqual(routes, ['/diary', '/habit', '/sober']);
  const display = await handler.handleNotification();
  assert.equal(display.shouldShowBanner, true);
  assert.equal(display.shouldPlaySound, true);
  failSync = true;
  foreground('active');
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].title, '알림을 예약하지 못했어요');
  nextCleanups.forEach((cleanup) => cleanup());
  assert.equal(removed, 3);
});
