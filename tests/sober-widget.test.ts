import { database, rows } from './database';
import { saveSober, saveSoberRestart, getSoberById, getSoberRestarts } from '../src/db/sober';
import { readBackupDatabase, replaceRecords } from '../src/backup/database';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import { createArchive, readArchive } from './backup-format';
import { t, resolveLocale, i18n } from '../src/i18n/core';
import * as soberI18n from '../src/i18n/sober';
import { mockI18n } from './helpers/i18n';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { defaultWidgetSettings, parseWidgetSettings } from '../src/widgets/sober/model';
import {
  getSoberSummary,
  SOBER_ICONS,
  formatSoberDuration,
  formatSoberGoal,
} from '../src/domain/sober';
import { ACCENT_KEYS } from '../src/theme/accents';
import { HABIT_ICON_COLORS, resolveIconColor } from '../src/domain/constants';
import type { Sober } from '../src/db/types';
import initSqlJs from 'sql.js';
import { ACCENT_PALETTES } from '../src/theme/colors';
import tokens from '../src/theme/tokens.json';
import icons from '../src/widgets/sober/icons.json';
import { buildIosSoberWidgetSnapshot } from '../src/widgets/sober/ios/snapshot';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path: string, mocks: Record<string, unknown>) {
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports: Record<string, any> = {};
  const localRequire = createRequire(new URL(path, import.meta.url));
  runInNewContext(source, {
    exports,
    __DEV__: true,
    Promise,
    console: { warn() {} },
    require: (name: string) => {
      if (name in mocks) return mocks[name];
      if (name.endsWith('/i18n/core')) return { t, resolveLocale };
      if (name.endsWith('/i18n/sober')) return soberI18n;
      if (name.endsWith('/i18n/locale')) return { readDeviceLocale: () => 'ko-KR' };
      if (name.endsWith('/i18n/react')) return mockI18n();
      return localRequire(name);
    },
  });
  return exports;
}

test('iOS snapshot shares current starts and widget colors without copying private record details', () => {
  const snapshot = buildIosSoberWidgetSnapshot(
    [
      {
        id: 1,
        name: '커피',
        icon_key: 'coffee',
        icon_color: 'theme',
        initial_started_at: '2026-10-01T00:00:00Z',
        goal_mode: 'AUTO',
        goal_days: null,
        description: 'private',
      } as Sober,
      {
        id: 2,
        name: '야식',
        icon_key: 'age19',
        icon_color: 'coral',
        initial_started_at: '2026-10-02T00:00:00Z',
        goal_mode: 'MANUAL',
        goal_days: 30,
      } as Sober,
    ],
    [
      { sober_id: 1, restarted_at: '2026-10-03T00:00:00Z', memo: 'private' } as any,
      { sober_id: 2, restarted_at: '2026-10-04T00:00:00Z' } as any,
    ],
    'purple',
  );
  assert.equal(snapshot.records[0].startedAt, Date.parse('2026-10-03T00:00:00Z') / 1000);
  assert.equal(snapshot.records[1].startedAt, Date.parse('2026-10-04T00:00:00Z') / 1000);
  assert.equal(snapshot.records[1].iconGlyph, '19');
  assert.equal(snapshot.records[1].iconKey, 'age19');
  assert.equal(snapshot.records[0].iconColor, ACCENT_PALETTES.purple.accent);
  assert.equal(snapshot.records[1].iconColor, HABIT_ICON_COLORS.coral.value);
  assert(!JSON.stringify(snapshot).includes('private'));
  for (const accent of ACCENT_KEYS)
    assert.equal(snapshot.accents[accent], ACCENT_PALETTES[accent].accent);
  for (const icon_key of Object.keys(SOBER_ICONS) as Sober['icon_key'][]) {
    const result = buildIosSoberWidgetSnapshot(
      [
        {
          id: 1,
          name: 'test',
          icon_key,
          initial_started_at: '2026-10-01T00:00:00Z',
          goal_mode: 'MANUAL',
          goal_days: 3,
        } as Sober,
      ],
      [],
    );
    assert.equal(result.records[0].iconKey, icon_key);
    assert(result.records[0].iconGlyph);
    assert(result.records[0].iconFont);
    assert.equal(result.records[0].iconColor, ACCENT_PALETTES.blue.accent);
  }
});

test('iOS bridge skips old binaries, clears deleted records and closes database on sync failure', async () => {
  let native: any = null;
  let opened = 0;
  let closed = 0;
  let sobers: Sober[] = [];
  const writes: string[] = [];
  const { syncIosSoberWidgets } = load('../src/widgets/sober/ios/sync.ts', {
    expo: { requireOptionalNativeModule: () => native },
    'expo-sqlite': {
      openDatabaseAsync: async () => {
        opened++;
        return {
          closeAsync: async () => {
            closed++;
          },
        };
      },
    },
    '../../../db': { withReadLock: (work: any) => work() },
    '../../../db/sober': { getSoberList: async () => sobers, getSoberRestarts: async () => [] },
    '../storage': {
      loadWidgetDisplaySettings: async () => ({
        themeAccent: 'pink',
        language: 'en',
        languagePreference: 'en',
      }),
    },
    './snapshot': { buildIosSoberWidgetSnapshot },
  });
  await syncIosSoberWidgets();
  assert.equal(opened, 0);
  native = {
    syncAsync: async (value: string) => {
      writes.push(value);
    },
  };
  sobers = [
    {
      id: 1,
      name: '커피',
      icon_key: 'coffee',
      initial_started_at: '2026-10-01T00:00:00Z',
      goal_mode: 'AUTO',
      goal_days: null,
    } as Sober,
  ];
  await syncIosSoberWidgets();
  sobers = [];
  await syncIosSoberWidgets();
  assert.equal(JSON.parse(writes[0]).records.length, 1);
  assert.equal(JSON.parse(writes[0]).language, 'en');
  assert.equal(JSON.parse(writes[0]).records[0].iconColor, ACCENT_PALETTES.pink.accent);
  assert.deepEqual(JSON.parse(writes[1]).records, []);
  native = {
    syncAsync: async () => {
      throw Error('native failed');
    },
  };
  await assert.rejects(syncIosSoberWidgets(), /native failed/);
  assert.equal(opened, 3);
  assert.equal(closed, opened);
});

test('iOS refresh dispatches safely and never imports the Android widget runtime', async () => {
  let updates = 0;
  const { refreshSoberWidgets } = load('../src/widgets/sober.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    './sober/model': { SOBER_WIDGET_NAME: 'Sober' },
    './sober/ios/sync': {
      syncIosSoberWidgets: async () => {
        updates++;
        throw Error('failed');
      },
    },
  });
  assert.equal(refreshSoberWidgets(), undefined);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(updates, 1);
});

test('widget appearance keeps backgrounds and text colors while ignoring legacy accent settings', () => {
  assert.deepEqual(defaultWidgetSettings(1), {
    soberId: 1,
    background: 'white',
    textColor: 'black',
  });
  for (const accent of [...ACCENT_KEYS, 'invalid', null]) {
    assert.deepEqual(
      parseWidgetSettings({
        ...defaultWidgetSettings(2),
        accent,
        background: 'transparent',
        textColor: 'white',
      }),
      { soberId: 2, background: 'transparent', textColor: 'white' },
    );
  }
  for (const background of ['white', 'black', 'transparent'] as const) {
    assert.equal(
      parseWidgetSettings({ ...defaultWidgetSettings(1), background }).background,
      background,
    );
  }
  for (const patch of [
    { soberId: 0 },
    { soberId: 1.5 },
    { background: 'theme' },
    { textColor: 'auto' },
  ])
    assert.throws(() => parseWidgetSettings({ ...defaultWidgetSettings(1), ...patch }));
});

test('widget assets match every current app icon and ship transparent iOS images', () => {
  const { buildIconAssets } = require('../scripts/render-widget-icons.cjs');
  const generated = buildIconAssets();
  assert.deepEqual(JSON.parse(JSON.stringify(generated.icons)), icons);
  assert.deepEqual(Object.keys(icons).sort(), Object.keys(SOBER_ICONS).sort());
  assert.equal(
    fs.readFileSync(
      new URL('../targets/sober-widget/SoberWidgetIcons.swift', import.meta.url),
      'utf8',
    ),
    generated.swift,
  );
  for (const key of Object.keys(icons)) {
    const asset = `sober-${key}`;
    const directory = new URL(
      `../targets/sober-widget/Assets.xcassets/${asset}.imageset/`,
      import.meta.url,
    );
    const contents = JSON.parse(fs.readFileSync(new URL('Contents.json', directory), 'utf8'));
    assert.equal(contents.properties['template-rendering-intent'], 'template');
    const file = new URL(contents.images[0].filename, directory);
    const png = fs.readFileSync(file);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 256);
    assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[25], 6, `${key} must preserve alpha`);
    assert(
      png.equals(
        fs.readFileSync(new URL(`../assets/widgets/sober-icons/${asset}.png`, import.meta.url)),
      ),
    );
  }
});

test('independent widget instances persist while app records are restored', async () => {
  const SQL = await initSqlJs();
  const databases = new Map<string, InstanceType<typeof SQL.Database>>();
  const openDatabaseAsync = async (name: string) => {
    let db = databases.get(name);
    if (!db) {
      db = new SQL.Database();
      databases.set(name, db);
    }
    const connection = db;
    return {
      execAsync: async (sql: string) => {
        connection.run(sql);
      },
      runAsync: async (sql: string, ...params: any[]) => {
        connection.run(sql, params);
      },
      getFirstAsync: async (sql: string, ...params: any[]) => {
        const statement = connection.prepare(sql);
        try {
          statement.bind(params);
          return statement.step() ? statement.getAsObject() : null;
        } finally {
          statement.free();
        }
      },
      closeAsync: async () => {},
    };
  };
  const { saveWidgetSettings, loadWidgetSettings, removeWidgetSettings } = load(
    '../src/widgets/sober/storage.ts',
    {
      'expo-sqlite': { openDatabaseAsync },
      '../../db': { withReadLock: (work: any) => work(), withWriteLock: (work: any) => work() },
      '../../db/sober': {},
      './model': { parseWidgetSettings },
    },
  );
  try {
    await saveWidgetSettings(10, defaultWidgetSettings(1));
    await saveWidgetSettings(11, {
      ...defaultWidgetSettings(2),
      accent: 'pink',
      background: 'transparent',
      textColor: 'white',
    });
    const app = await openDatabaseAsync('took.db');
    await app.execAsync(
      "CREATE TABLE settings (value TEXT); INSERT INTO settings VALUES ('app'); DELETE FROM settings;",
    );
    assert.equal((await loadWidgetSettings(10)).soberId, 1);
    assert.equal((await loadWidgetSettings(11)).background, 'transparent');
    assert.equal('accent' in (await loadWidgetSettings(11)), false);
    await removeWidgetSettings(10);
    assert.equal(await loadWidgetSettings(10), null);
    assert.equal((await loadWidgetSettings(11)).textColor, 'white');
    assert.throws(() => saveWidgetSettings(-1, defaultWidgetSettings(1)));
  } finally {
    databases.forEach((db) => db.close());
  }
});

test('widget theme loading uses blue for missing, malformed, invalid, or unreadable preferences', async () => {
  const { loadWidgetDisplaySettings, loadWidgetRecord } = load('../src/widgets/sober/storage.ts', {
    'expo-sqlite': { openDatabaseAsync: async () => db },
    '../../db': { withReadLock: (work: any) => work(), withWriteLock: (work: any) => work() },
    '../../db/sober': {
      getSoberById: async () => ({ id: 1, icon_color: 'theme' }),
      getSoberRestarts: async () => [],
    },
  });
  let row: unknown = null;
  let failure = false;
  let closed = 0;
  const db = {
    getFirstAsync: async () => {
      if (failure) throw Error('read failed');
      return row;
    },
    closeAsync: async () => closed++,
  };
  for (const themeAccent of ACCENT_KEYS) {
    row = { value: JSON.stringify({ themeAccent }) };
    assert.equal((await loadWidgetDisplaySettings(db)).themeAccent, themeAccent);
    assert.equal((await loadWidgetRecord(1)).themeAccent, themeAccent);
  }
  for (const value of [null, '{broken', 'null', '{}', '{"themeAccent":"invalid"}']) {
    row = value === null ? null : { value };
    assert.equal((await loadWidgetDisplaySettings(db)).themeAccent, 'blue');
  }
  failure = true;
  const record = await loadWidgetRecord(1);
  assert.equal(record.sober.id, 1);
  assert.equal(record.themeAccent, 'blue');
  assert.equal(closed, ACCENT_KEYS.length + 1);
});

test('widget task reads current records, keeps old content on read failure, and removes only deleted instance', async () => {
  const renders: unknown[] = [];
  const removed: number[] = [];
  let failure = false;
  const task = load('../src/widgets/sober/task.tsx', {
    './model': { SOBER_WIDGET_NAME: 'Sober' },
    './SoberWidget': { SoberWidget: () => null },
    './storage': {
      loadWidgetSettings: async () => defaultWidgetSettings(1),
      loadWidgetRecord: async () => {
        if (failure) throw Error('busy');
        return { sober: null, restarts: [] };
      },
      removeWidgetSettings: async (id: number) => {
        removed.push(id);
      },
    },
  });
  const props = {
    widgetInfo: { widgetName: 'Sober', widgetId: 10, width: 180, height: 180 },
    widgetAction: 'WIDGET_UPDATE',
    renderWidget: (tree: unknown) => renders.push(tree),
  };
  await task.soberWidgetTask(props);
  assert.equal(renders.length, 1);
  failure = true;
  await assert.rejects(task.soberWidgetTask(props));
  assert.equal(renders.length, 1);
  await task.soberWidgetTask({ ...props, widgetAction: 'WIDGET_DELETED' });
  assert.deepEqual(removed, [10]);
  await task.soberWidgetTask({
    ...props,
    widgetInfo: { ...props.widgetInfo, widgetName: 'Other' },
  });
  assert.equal(renders.length, 1);
});

test('missing native module and failed updates do not fail saved app actions', async () => {
  for (const native of [null, {}]) {
    let updates = 0;
    const bridge = load('../src/widgets/sober.ts', {
      'react-native': { Platform: { OS: 'android' }, TurboModuleRegistry: { get: () => native } },
      './sober/model': { SOBER_WIDGET_NAME: 'Sober' },
      'react-native-android-widget': {
        getWidgetInfo: async () => [{ widgetId: 1 }],
        requestWidgetUpdateById: async () => {
          updates++;
          throw Error('native failed');
        },
      },
      './sober/task': { renderSoberWidget: () => null },
    });
    assert.equal(bridge.refreshSoberWidgets(), undefined);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(updates, native ? 1 : 0);
  }
});

test('widget elapsed time uses the same restart-aware app summary', () => {
  const sober = {
    initial_started_at: '2026-10-01T00:00:00Z',
    goal_mode: 'MANUAL',
    goal_days: 30,
  } as Sober;
  const summary = getSoberSummary(
    sober,
    [{ restarted_at: '2026-10-03T00:00:00Z' } as any],
    Date.parse('2026-10-04T00:00:00Z'),
  );
  assert.equal(summary.progress, 100 / 30);
});

test('actual library serializes selected icons, transparent background and shared elapsed text', () => {
  const library = fs.realpathSync(
    new URL('../node_modules/react-native-android-widget/lib/commonjs/', import.meta.url),
  );
  const widgets = Object.assign(
    {},
    ...['FlexWidget', 'TextWidget', 'IconWidget', 'OverlapWidget'].map((name) =>
      require(`${library}/widgets/${name}.js`),
    ),
  );
  Object.assign(
    widgets,
    load('../node_modules/react-native-android-widget/lib/commonjs/widgets/SvgWidget.js', {
      'react-native': {
        Image: {
          resolveAssetSource: () => {
            throw Error('Inline SVG should not resolve assets');
          },
        },
      },
    }),
  );
  const { buildWidgetTree } = require(`${library}/api/build-widget-tree.js`);
  const { SoberWidget } = load('../src/widgets/sober/SoberWidget.tsx', {
    'react-native-android-widget': widgets,
    '../../theme/colors': { ACCENT_PALETTES },
    '../../theme/tokens.json': tokens,
    '../../domain/sober': { getSoberSummary, SOBER_ICONS, formatSoberDuration, formatSoberGoal },
  });
  const sober = {
    id: 1,
    name: '잘자기',
    icon_key: 'oversleep',
    initial_started_at: '2026-10-01T00:00:00Z',
    goal_mode: 'MANUAL',
    goal_days: 30,
  } as Sober;
  const tree = buildWidgetTree(
    SoberWidget({
      language: 'ko',
      settings: { ...defaultWidgetSettings(1), background: 'transparent', textColor: 'white' },
      sober,
      width: 205,
      height: 194,
      now: Date.parse('2026-10-16T06:54:00Z'),
    }),
  );
  const flatten = (node: any): any[] => [node, ...(node.children ?? []).flatMap(flatten)];
  const nodes = flatten(tree);
  assert.equal(tree.props.backgroundColor, '#00ffffff');
  assert.equal(tree.props.clickActionData.uri, 'took-local://sober/1');
  const texts = nodes.filter((node) => node.type === 'TextWidget');
  assert.equal(texts.find((node) => node.props.text === '잘자기').props.color, '#FFFFFF');
  const blackTree = buildWidgetTree(
    SoberWidget({
      language: 'ko',
      settings: { ...defaultWidgetSettings(1), background: 'black' },
      sober,
      width: 180,
      height: 180,
    }),
  );
  assert.equal(blackTree.props.backgroundColor, '#000000');
  assert.equal(
    flatten(blackTree).find((node) => node.props.text === '잘자기').props.color,
    tokens.colorValues.lightTextPrimary,
  );
  assert(
    texts.some(
      (node) =>
        node.props.text ===
        formatSoberDuration(
          getSoberSummary(sober, [], Date.parse('2026-10-16T06:54:00Z')).duration,
        ),
    ),
  );
  assert.equal(nodes.filter((node) => node.type === 'IconWidget').length, 0);
  for (const icon_key of Object.keys(icons) as Sober['icon_key'][]) {
    const selected = buildWidgetTree(
      SoberWidget({
        language: 'ko',
        settings: { ...defaultWidgetSettings(1), accent: 'pink' },
        themeAccent: 'purple',
        sober: { ...sober, icon_key },
        width: 180,
        height: 180,
      }),
    );
    const icon = flatten(selected).find((node) => node.type === 'SvgWidget');
    assert.equal(
      icon.props.svgString,
      icons[icon_key].replaceAll('currentColor', ACCENT_PALETTES.purple.accent),
    );
    const holder = selected.children[0].children[0];
    assert.equal(holder.props.backgroundColor, undefined);
    assert.equal(holder.props.borderRadius, undefined);
    assert.equal(icon.props.width, 28);
    assert.equal(icon.props.height, 28);
  }
  for (const icon_color of ['theme', ...Object.keys(HABIT_ICON_COLORS)] as Sober['icon_color'][]) {
    const colored = buildWidgetTree(
      SoberWidget({
        language: 'ko',
        settings: defaultWidgetSettings(1),
        themeAccent: 'green',
        sober: { ...sober, icon_color },
        width: 180,
        height: 180,
      }),
    );
    const color = resolveIconColor(icon_color, ACCENT_PALETTES.green.accent);
    assert.equal(
      flatten(colored).find((node) => node.type === 'SvgWidget').props.svgString,
      icons[sober.icon_key].replaceAll('currentColor', color),
    );
    assert(flatten(colored).some((node) => node.props.backgroundColor === color));
  }
  for (const themeAccent of [undefined, 'invalid']) {
    const fallback = buildWidgetTree(
      SoberWidget({
        language: 'ko',
        settings: defaultWidgetSettings(1),
        sober,
        themeAccent,
        width: 180,
        height: 180,
      }),
    );
    assert.equal(
      flatten(fallback).find((node) => node.type === 'SvgWidget').props.svgString,
      icons[sober.icon_key].replaceAll('currentColor', ACCENT_PALETTES.blue.accent),
    );
  }
  for (const [days, expected] of [
    [364, '364일 23시간 59분'],
    [365, '365일 23시간 59분'],
    [366, '366일 23시간 59분'],
    [730, '730일 23시간 59분'],
    [1094, '1094일 23시간 59분'],
  ] as const) {
    for (const size of [110, 180]) {
      const durationTree = buildWidgetTree(
        SoberWidget({
          language: 'ko',
          settings: defaultWidgetSettings(1),
          sober,
          width: size,
          height: size,
          now: Date.parse(sober.initial_started_at) + days * 86400000 + 1439 * 60000,
        }),
      );
      const elapsed = flatten(durationTree).find((node) => node.props.text === expected);
      assert(elapsed, `Missing elapsed text: ${expected}`);
      assert.equal(elapsed.props.maxLines, 1);
      assert.equal(elapsed.props.adjustsFontSizeToFit, true);
      assert(durationTree.props.accessibilityLabel.includes(expected));
    }
  }
  assert.doesNotThrow(() =>
    buildWidgetTree(
      SoberWidget({ language: 'ko', settings: null, sober: null, width: 180, height: 180 }),
    ),
  );
  const now = Date.parse('2026-10-03T03:04:00Z');
  const props = { settings: defaultWidgetSettings(1), sober, width: 180, height: 180, now };
  const koTree = buildWidgetTree(SoberWidget({ ...props, language: 'ko' }));
  const enTree = buildWidgetTree(SoberWidget({ ...props, language: 'en' }));
  const englishTexts = flatten(enTree)
    .filter((node) => node.type === 'TextWidget')
    .map((node) => node.props.text);
  assert(englishTexts.includes('2d 3h 4m'));
  assert(englishTexts.includes('Goal 1 month'));
  assert.equal(enTree.props.clickActionData.uri, koTree.props.clickActionData.uri);
  assert.deepEqual(
    flatten(enTree).map((node) => [node.props.width, node.props.height]),
    flatten(koTree).map((node) => [node.props.width, node.props.height]),
  );
  assert(enTree.props.accessibilityLabel.includes('2d 3h 4m'));
  assert(!/[가-힣]/.test(enTree.props.accessibilityLabel.replace(sober.name, '')));
  for (const settings of [null, defaultWidgetSettings(1)]) {
    const empty = buildWidgetTree(
      SoberWidget({ settings, sober: null, language: 'en', width: 110, height: 110 }),
    );
    assert(!/[가-힣]/.test(empty.props.accessibilityLabel));
    assert(
      flatten(empty)
        .filter((node) => node.type === 'TextWidget')
        .every((node) => !/[가-힣]/.test(node.props.text)),
    );
  }
});

test('native widget sync updates existing Android preview and emits iOS catalog without prebuild', () => {
  const { syncNativeAssets } = require('../scripts/render-widget-icons.cjs');
  const project = fs.mkdtempSync(join(tmpdir(), 'took-native-widget-resources-'));
  try {
    fs.mkdirSync(join(project, 'src/widgets/sober'), { recursive: true });
    fs.mkdirSync(join(project, 'src/theme'), { recursive: true });
    const theme = JSON.parse(JSON.stringify(tokens));
    theme.colorValues[theme.colors.light.textPrimary] = '#123456';
    fs.writeFileSync(join(project, 'src/theme/tokens.json'), JSON.stringify(theme));
    fs.mkdirSync(join(project, 'assets/widgets/sober-icons'), { recursive: true });
    fs.writeFileSync(
      join(project, 'src/widgets/sober/icons.json'),
      JSON.stringify({ coffee: icons.coffee }),
    );
    const png = fs.readFileSync(
      new URL('../assets/widgets/sober-icons/sober-coffee.png', import.meta.url),
    );
    fs.writeFileSync(join(project, 'assets/widgets/sober-icons/sober-coffee.png'), png);
    const preview = fs.readFileSync(
      new URL('../assets/widgets/sober-preview.png', import.meta.url),
    );
    fs.writeFileSync(join(project, 'assets/widgets/sober-preview.png'), preview);
    syncNativeAssets(project);
    assert(!fs.existsSync(join(project, 'android')));
    const color = JSON.parse(
      fs.readFileSync(
        join(
          project,
          'targets/sober-widget/Assets.xcassets/WidgetTextPrimaryLight.colorset/Contents.json',
        ),
        'utf8',
      ),
    ).colors[0].color.components;
    assert.equal(Number(color.red), 18 / 255);
    assert.equal(Number(color.green), 52 / 255);
    assert.equal(Number(color.blue), 86 / 255);
    const imageset = join(project, 'targets/sober-widget/Assets.xcassets/sober-coffee.imageset');
    assert(fs.readFileSync(join(imageset, 'icon.png')).equals(png));
    fs.mkdirSync(join(project, 'android/app/src/main/res/drawable'), { recursive: true });
    const nativePreview = join(project, 'android/app/src/main/res/drawable/sober_preview.png');
    fs.writeFileSync(nativePreview, 'old preview');
    syncNativeAssets(project);
    assert(fs.readFileSync(nativePreview).equals(preview));
    assert(fs.readFileSync(join(imageset, 'icon.png')).equals(png));
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('headless widgets resolve saved manual and system languages without changing the app locale', async () => {
  const appLocale = i18n.locale;
  let device = 'ja-JP';
  let row: any = null;
  let failure = false;
  let recordReads = 0;
  let closed = 0;
  const db = {
    getFirstAsync: async () => {
      if (failure) throw new Error('unreadable');
      return row;
    },
    closeAsync: async () => {
      closed++;
    },
  };
  const { loadWidgetDisplaySettings, loadWidgetRecord } = load('../src/widgets/sober/storage.ts', {
    '../../i18n/locale': { readDeviceLocale: () => device },
    'expo-sqlite': { openDatabaseAsync: async () => db },
    '../../db': { withReadLock: (work: any) => work(), withWriteLock: (work: any) => work() },
    '../../db/sober': {
      getSoberById: async () => {
        recordReads++;
        return { id: 1 };
      },
      getSoberRestarts: async () => [],
    },
  });
  for (const [preference, tag, expected] of [
    ['en', 'ko-KR', 'en'],
    ['ko', 'en-US', 'ko'],
    ['system', 'ko-KR', 'ko'],
    ['system', 'en-GB', 'en'],
    ['system', 'ja-JP', 'en'],
    ['system', 'fr-FR', 'en'],
    ...['zh-Hans-CN', 'ar-SA', 'he-IL', 'hi-IN', 'th-TH', 'ru-RU', 'es-MX', 'pt-BR', 'kok-IN'].map(
      (tag) => ['system', tag, 'en'],
    ),
    ['system', 'ko-Kore-KR', 'ko'],
    ['invalid', 'ko-KR', 'ko'],
  ]) {
    device = tag;
    row = { value: JSON.stringify({ language: preference, themeAccent: 'purple' }) };
    const result = await loadWidgetDisplaySettings(db);
    assert.equal(result.language, expected);
    assert.equal(result.themeAccent, 'purple');
  }
  device = 'fr-FR';
  for (const value of [null, '{broken', 'null', '{}']) {
    row = value === null ? null : { value };
    assert.equal((await loadWidgetDisplaySettings(db)).language, 'en');
  }
  failure = true;
  assert.equal((await loadWidgetDisplaySettings(db)).themeAccent, 'blue');
  failure = false;
  row = { value: JSON.stringify({ language: 'ko' }) };
  const empty = await loadWidgetRecord();
  assert.equal(empty.language, 'ko');
  assert.equal(empty.sober, null);
  assert.equal(recordReads, 0);
  assert.equal(closed, 1);
  assert.equal(i18n.locale, appLocale);
});

test('unconfigured widget tasks also read persisted display language', async () => {
  const ids: unknown[] = [];
  const task = load('../src/widgets/sober/task.tsx', {
    './model': { SOBER_WIDGET_NAME: 'Sober' },
    './storage': {
      loadWidgetSettings: async () => null,
      loadWidgetRecord: async (id: unknown) => {
        ids.push(id);
        return { sober: null, restarts: [], themeAccent: 'blue', language: 'en' };
      },
    },
    './SoberWidget': { SoberWidget: () => null },
  });
  const tree = await task.renderSoberWidget({ widgetId: 10, width: 180, height: 180 });
  assert.equal(tree.props.language, 'en');
  assert.deepEqual(ids, [undefined]);
});

test('Android launcher resources provide English fallback and Korean labels without changing widget identity', async () => {
  const project = fs.mkdtempSync(join(tmpdir(), 'bloolog-widget-locale-'));
  const callbacks: any = {};
  const config = { android: { package: 'com.everstamp' } };
  const pluginModule: any = { exports: {} };
  runInNewContext(
    fs.readFileSync(new URL('../plugins/withSamsungSoberWidget.cjs', import.meta.url), 'utf8'),
    {
      module: pluginModule,
      exports: pluginModule.exports,
      require: (name: string) =>
        name === 'expo/config-plugins'
          ? {
              AndroidConfig: {
                Manifest: { getMainApplicationOrThrow: (manifest: any) => manifest.application },
              },
              withAndroidManifest: (value: any, callback: any) => {
                callbacks.manifest = callback;
                return value;
              },
              withDangerousMod: (value: any, [_platform, callback]: any) => {
                callbacks.resources = callback;
                return value;
              },
            }
          : require(name),
    },
  );
  try {
    pluginModule.exports(config);
    const resources = join(project, 'app/src/main/res');
    fs.mkdirSync(join(resources, 'xml'), { recursive: true });
    const provider = join(resources, 'xml/widgetprovider_sober.xml');
    fs.writeFileSync(
      provider,
      '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:description="@string/widget_sober_description" />',
    );
    const manifest: any = {
      modResults: { application: { receiver: [{ $: { 'android:name': '.widget.Sober' } }] } },
    };
    for (let repeat = 0; repeat < 2; repeat++) {
      callbacks.manifest(manifest);
      await callbacks.resources({ ...config, modRequest: { platformProjectRoot: project } });
    }
    const english = fs.readFileSync(
      join(resources, 'values/took_sober_widget_strings.xml'),
      'utf8',
    );
    const korean = fs.readFileSync(
      join(resources, 'values-ko/took_sober_widget_strings.xml'),
      'utf8',
    );
    assert(english.includes('>Cut Back Timer</string>'));
    assert(korean.includes('>거리두기 타이머</string>'));
    const { AndroidConfig } = require('expo/config-plugins');
    for (const [directory, label] of [
      ['values', 'Cut Back Timer'],
      ['values-ko', '거리두기 타이머'],
    ]) {
      const xml = await AndroidConfig.Resources.readResourcesXMLAsync({
        path: join(resources, directory, 'took_sober_widget_strings.xml'),
      });
      assert.equal(
        xml.resources.string.find((item: any) => item.$.name === 'took_sober_widget_label')._,
        label,
      );
    }
    assert(!english.includes('BlooLog'));
    const generated = fs.readFileSync(provider, 'utf8');
    assert(generated.includes('android:description="@string/took_sober_widget_description"'));
    assert.equal((generated.match(/android:previewLayout=/g) ?? []).length, 1);
    assert.equal(manifest.modResults.application.receiver[0]['meta-data'].length, 1);
    const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
    const widget = app.plugins.find((plugin: any) => plugin[0] === 'react-native-android-widget')[1]
      .widgets[0];
    assert.equal(widget.name, 'Sober');
    assert.equal(widget.label, '@string/took_sober_widget_label');
    assert.equal(widget.updatePeriodMillis, 1800000);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('real backup restores retain independent legacy widget selections and refresh records, language and deleted states', async () => {
  const app = await database();
  const source = await database();
  const widget = await database(new Uint8Array());
  let device = 'ko-KR';
  const opened: string[] = [];
  const closed: string[] = [];
  const storage = load('../src/widgets/sober/storage.ts', {
    '../../i18n/locale': { readDeviceLocale: () => device },
    'expo-sqlite': {
      openDatabaseAsync: async (name: string) => {
        assert(['took.db', 'took-widgets.db'].includes(name));
        opened.push(name);
        return {
          ...(name === 'took.db' ? app.db : widget.db),
          closeAsync: async () => {
            closed.push(name);
          },
        };
      },
    },
    '../../db': { withReadLock: (work: any) => work(), withWriteLock: (work: any) => work() },
    '../../db/sober': { getSoberById, getSoberRestarts },
  });
  const widgetRenderer = load('../src/widgets/sober/SoberWidget.tsx', {
    'react-native-android-widget': {
      FlexWidget: 'FlexWidget',
      OverlapWidget: 'OverlapWidget',
      SvgWidget: 'SvgWidget',
      TextWidget: 'TextWidget',
    },
  });
  const task = load('../src/widgets/sober/task.tsx', {
    './storage': storage,
    './model': { SOBER_WIDGET_NAME: 'Sober' },
    './SoberWidget': widgetRenderer,
  });
  const values = (tree: any): any[] =>
    !tree || typeof tree !== 'object'
      ? []
      : Array.isArray(tree)
        ? tree.flatMap(values)
        : [tree, ...values(tree.props?.children)];
  const now = Date.parse('2024-02-04T00:00:00Z');
  try {
    const input = {
      description: null,
      icon_key: 'coffee' as const,
      icon_color: 'theme' as const,
      is_priority: 0 as const,
      initial_started_at: '2024-01-01T00:00:00.000Z',
      goal_mode: 'MANUAL' as const,
      goal_days: 30,
    };
    await saveSober(app.db, { ...input, name: '교체 전 1' });
    await saveSober(app.db, { ...input, name: '교체 전 2' });
    await app.db.runAsync(
      'INSERT INTO settings VALUES (?,?)',
      'preferences',
      JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ko' }),
    );
    await storage.saveWidgetSettings(10, { soberId: 1, background: 'black', textColor: 'white' });
    await widget.db.runAsync(
      'UPDATE widget_settings SET value=? WHERE widget_id=?',
      JSON.stringify({ soberId: 1, background: 'black', textColor: 'white', accent: 'pink' }),
      10,
    );
    await storage.saveWidgetSettings(11, { soberId: 2, background: 'white', textColor: 'black' });
    const stored = rows(
      widget.raw,
      'SELECT widget_id,value FROM widget_settings ORDER BY widget_id',
    );
    const id = await saveSober(source.db, {
      ...input,
      name: '복원된 기록',
      initial_started_at: '2024-02-01T00:00:00.000Z',
    });
    await saveSoberRestart(source.db, {
      sober_id: id,
      restarted_at: '2024-02-03T00:00:00.000Z',
      memo: '원문 메모',
    });
    for (const legacy of [false, true]) {
      const preferences: any = {
        ...DEFAULT_SETTINGS,
        language: 'en',
        themeAccent: 'purple',
        diaryReminderTime: '08:15',
      };
      if (legacy) delete preferences.language;
      await source.db.runAsync(
        'INSERT OR REPLACE INTO settings VALUES (?,?)',
        'preferences',
        JSON.stringify(preferences),
      );
      const archive = readArchive(createArchive({ 'took.db': source.raw.export() }));
      const snapshot = await database(archive.files['took.db']);
      try {
        const records = await readBackupDatabase(snapshot.db, archive.files);
        await replaceRecords(app.db, records, new Map());
      } finally {
        snapshot.raw.close();
      }
      const first = await task.renderSoberWidget({ widgetId: 10, width: 180, height: 180 });
      assert.equal(first.props.language, legacy ? 'ko' : 'en');
      assert.equal(first.props.themeAccent, 'purple');
      assert.equal(first.props.settings.soberId, 1);
      assert.equal(first.props.settings.background, 'black');
      assert.equal(first.props.settings.textColor, 'white');
      assert.equal(first.props.sober.name, '복원된 기록');
      assert.equal(first.props.restarts[0].memo, '원문 메모');
      const tree = widgetRenderer.SoberWidget({ ...first.props, now });
      assert(
        values(tree).some((node) => node.props?.text === (legacy ? '1일 0시간 0분' : '1d 0h 0m')),
      );
      assert.equal(tree.props.clickActionData.uri, 'took-local://sober/1');
      const second = await task.renderSoberWidget({ widgetId: 11, width: 180, height: 180 });
      assert.equal(second.props.sober, null);
      assert.equal(second.props.settings.soberId, 2);
      const missing = widgetRenderer.SoberWidget({ ...second.props, now });
      assert(
        values(missing).some(
          (node) =>
            node.props?.text ===
            (legacy
              ? '선택한 거리두기 항목이 없어요. 위젯 설정에서 다시 선택해주세요.'
              : 'The selected Cut Back item is missing. Choose another in widget settings.'),
        ),
      );
      assert.deepEqual(
        rows(widget.raw, 'SELECT widget_id,value FROM widget_settings ORDER BY widget_id'),
        stored,
      );
    }
    device = 'fr-FR';
    assert.equal((await storage.loadWidgetRecord(1)).language, 'en');
    assert.deepEqual(closed, opened);
  } finally {
    app.raw.close();
    source.raw.close();
    widget.raw.close();
  }
});

test('widget bootstrap does not import enforcing Android modules on iOS, web or old Android binaries', () => {
  for (const [platform, native, expected] of [
    ['ios', null, false],
    ['web', null, false],
    ['android', null, false],
    ['android', {}, true],
  ] as const) {
    let widgetImports = 0;
    let routerImports = 0;
    let moduleChecks = 0;
    const registrations: unknown[] = [];
    const task = () => {};
    const configure = () => {};
    const mocks: any = {
      './global.css': {},
      'react-native': {
        Platform: { OS: platform },
        TurboModuleRegistry: {
          get: (name: string) => {
            moduleChecks++;
            assert.equal(name, 'AndroidWidget');
            return native;
          },
        },
      },
      './src/widgets/sober/task': { soberWidgetTask: task },
      './src/widgets/sober/ConfigurationScreen': { SoberWidgetConfiguration: configure },
    };
    Object.defineProperty(mocks, 'react-native-android-widget', {
      get: () => {
        widgetImports++;
        return {
          registerWidgetTaskHandler: (callback: unknown) => registrations.push(callback),
          registerWidgetConfigurationScreen: (callback: unknown) => registrations.push(callback),
        };
      },
    });
    Object.defineProperty(mocks, 'expo-router/entry', {
      get: () => {
        routerImports++;
        return {};
      },
    });
    load('../index.ts', mocks);
    assert.equal(widgetImports, expected ? 1 : 0);
    assert.deepEqual(registrations, expected ? [task, configure] : []);
    assert.equal(routerImports, 1);
    assert.equal(moduleChecks, platform === 'android' ? 1 : 0);
  }
});

test('one stale Android widget failure does not prevent other existing instances from being refreshed', async () => {
  const updates: number[] = [];
  const bridge = load('../src/widgets/sober.ts', {
    'react-native': { Platform: { OS: 'android' }, TurboModuleRegistry: { get: () => ({}) } },
    './sober/model': { SOBER_WIDGET_NAME: 'Sober' },
    './sober/task': { renderSoberWidget: () => null },
    'react-native-android-widget': {
      getWidgetInfo: async (name: string) => {
        assert.equal(name, 'Sober');
        return [{ widgetId: 10 }, { widgetId: 11 }];
      },
      requestWidgetUpdateById: async (value: any) => {
        updates.push(value.widgetId);
        if (value.widgetId === 10) throw new Error('stale native instance');
      },
    },
  });
  assert.doesNotThrow(() => bridge.refreshSoberWidgets());
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(updates, [10, 11]);
});
