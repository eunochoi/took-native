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
    require: (name: string) => (name in mocks ? mocks[name] : localRequire(name)),
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
    '../storage': { loadWidgetThemeAccent: async () => 'pink' },
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
  const { loadWidgetThemeAccent, loadWidgetRecord } = load('../src/widgets/sober/storage.ts', {
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
    assert.equal(await loadWidgetThemeAccent(db), themeAccent);
    assert.equal((await loadWidgetRecord(1)).themeAccent, themeAccent);
  }
  for (const value of [null, '{broken', 'null', '{}', '{"themeAccent":"invalid"}']) {
    row = value === null ? null : { value };
    assert.equal(await loadWidgetThemeAccent(db), 'blue');
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
    buildWidgetTree(SoberWidget({ settings: null, sober: null, width: 180, height: 180 })),
  );
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
