import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { defaultWidgetSettings, parseWidgetSettings } from '../src/widgets/sober/model';
import {
  getSoberSummary,
  SOBER_ICONS,
  formatSoberDuration,
  formatSoberGoal,
} from '../src/domain/sober';
import { ACCENT_KEYS, ACCENT_LABELS } from '../src/theme/accents';
import type { Sober } from '../src/db/types';
import initSqlJs from 'sql.js';
import { ACCENT_PALETTES } from '../src/theme/colors';
import tokens from '../src/theme/tokens.json';

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
  runInNewContext(source, {
    exports,
    __DEV__: true,
    Promise,
    console: { warn() {} },
    require: (name: string) => (name in mocks ? mocks[name] : require(name)),
  });
  return exports;
}

test('widget choices are independent, validated, and use every existing Korean accent label', () => {
  assert.deepEqual(defaultWidgetSettings(1), {
    soberId: 1,
    accent: 'blue',
    background: 'white',
    textColor: 'black',
  });
  for (const accent of ACCENT_KEYS) {
    assert(ACCENT_LABELS[accent]);
    assert.equal(
      parseWidgetSettings({
        ...defaultWidgetSettings(2),
        accent,
        background: 'transparent',
        textColor: 'white',
      }).accent,
      accent,
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
    { accent: 'red' },
    { background: 'theme' },
    { textColor: 'auto' },
  ])
    assert.throws(() => parseWidgetSettings({ ...defaultWidgetSettings(1), ...patch }));
});

test('widget glyphs cover the actual selectable icons', () => {
  for (const icon of Object.values(SOBER_ICONS)) {
    if (icon.family === 'badge') continue;
    const font = icon.family === 'ionicons' ? 'Ionicons' : 'MaterialCommunityIcons';
    const glyphs = require(
      `@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/${font}.json`,
    );
    assert.equal(typeof glyphs[icon.name], 'number');
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
    assert.equal((await loadWidgetSettings(11)).accent, 'pink');
    await removeWidgetSettings(10);
    assert.equal(await loadWidgetSettings(10), null);
    assert.equal((await loadWidgetSettings(11)).textColor, 'white');
    assert.throws(() => saveWidgetSettings(-1, defaultWidgetSettings(1)));
  } finally {
    databases.forEach((db) => db.close());
  }
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
      'react-native': { TurboModuleRegistry: { get: () => native } },
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
  assert.equal(nodes.filter((node) => node.type === 'IconWidget').length, 1);
  for (const [days, expected] of [
    [364, '364일 23시간 59분'],
    [365, '1년 23시간'],
    [730, '2년 23시간'],
    [1094, '2년 364일 23시간'],
  ] as const) {
    for (const size of [110, 180]) {
      const yearTree = buildWidgetTree(
        SoberWidget({
          settings: defaultWidgetSettings(1),
          sober,
          width: size,
          height: size,
          now: Date.parse(sober.initial_started_at) + days * 86400000 + 1439 * 60000,
        }),
      );
      const elapsed = flatten(yearTree).find((node) => node.props.text === expected);
      assert(elapsed, `Missing elapsed text: ${expected}`);
      assert.equal(elapsed.props.maxLines, 1);
      assert.equal(elapsed.props.adjustsFontSizeToFit, true);
      assert(yearTree.props.accessibilityLabel.includes(expected));
    }
  }
  assert.doesNotThrow(() =>
    buildWidgetTree(SoberWidget({ settings: null, sober: null, width: 180, height: 180 })),
  );
});
