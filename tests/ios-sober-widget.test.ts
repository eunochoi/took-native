import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createRequire } from 'node:module';
import type { Sober } from '../src/db/types';
import {
  formatSoberDuration,
  formatSoberGoal,
  getSoberSummary,
  SOBER_GOALS,
  SOBER_ICONS,
} from '../src/domain/sober';
import { buildIosSoberWidgetSnapshot } from '../src/widgets/sober/ios/snapshot';
import { ACCENT_PALETTES } from '../src/theme/colors';
import { HABIT_ICON_COLORS } from '../src/domain/constants';

const root = fileURLToPath(new URL('../', import.meta.url));

test('iOS widget and host declare the same App Group and extension credentials', () => {
  const require = createRequire(import.meta.url);
  const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
  const target = require('../targets/sober-widget/expo-target.config.js')(config);
  const group = config.ios.infoPlist.TookWidgetAppGroup;
  assert.deepEqual(target.entitlements['com.apple.security.application-groups'], [group]);
  const extension = readFileSync(join(root, 'targets/sober-widget/Info.plist'), 'utf8');
  assert(extension.includes('<string>$(TOOK_WIDGET_APP_GROUP)</string>'));
  assert.equal(target.bundleIdentifier, '.sober-widget');
  assert.equal(target.deploymentTarget, '17.0');
});

test(
  'Swift widget calculations match the app at restart and goal boundaries and for long durations',
  {
    skip: process.platform !== 'darwin',
    timeout: 120000,
  },
  () => {
    const temp = mkdtempSync(join(tmpdir(), 'took-widget-test-'));
    try {
      const start = Date.parse('2026-10-01T00:00:00Z');
      const sobers = [
        {
          id: 1,
          name: '자동 목표',
          icon_key: 'coffee',
          initial_started_at: new Date(start - 86400000).toISOString(),
          goal_mode: 'AUTO',
          goal_days: null,
        },
        {
          id: 2,
          name: '직접 목표',
          icon_key: 'moon',
          initial_started_at: new Date(start).toISOString(),
          goal_mode: 'MANUAL',
          goal_days: 30,
        },
      ] as Sober[];
      const restarts = [{ id: 1, sober_id: 1, restarted_at: new Date(start).toISOString() } as any];
      const snapshot = buildIosSoberWidgetSnapshot(sobers, restarts);
      const dates = [
        -60,
        0,
        59,
        60,
        86400,
        ...SOBER_GOALS.flatMap((day) => [day * 86400 - 1, day * 86400]),
        364 * 86400 + 86340,
        365 * 86400 + 86340,
        366 * 86400 + 8 * 3600 + 15 * 60,
        1094 * 86400 + 86340,
      ].map((offset) => start / 1000 + offset);
      const invalid = [
        { ...snapshot, version: 2 },
        { ...snapshot, goals: [] },
        { ...snapshot, goals: [3, 1] },
        { ...snapshot, records: [snapshot.records[0], snapshot.records[0]] },
        { ...snapshot, records: [{ ...snapshot.records[0], id: -1 }] },
        { ...snapshot, records: [{ ...snapshot.records[1], goalDays: 0 }] },
      ].map((value) => JSON.stringify(value));
      const fontFiles = [
        'TmoneyRoundWindRegular.otf',
        'TmoneyRoundWindExtraBold.otf',
        'Ionicons.ttf',
        'MaterialCommunityIcons.ttf',
      ];
      const iconSnapshots: string[] = [];
      const assetNames: string[] = [];
      for (const icon_key of Object.keys(SOBER_ICONS) as Sober['icon_key'][]) {
        const current = buildIosSoberWidgetSnapshot([{ ...sobers[0], icon_key }], []);
        const { iconKey, iconColor: _iconColor, ...legacy } = current.records[0];
        iconSnapshots.push(
          JSON.stringify(current),
          JSON.stringify({ ...current, records: [legacy] }),
        );
        assetNames.push(`sober-${iconKey}`, `sober-${iconKey}`);
      }
      iconSnapshots.push(
        JSON.stringify({ ...snapshot, records: [{ ...snapshot.records[0], iconKey: 'unknown' }] }),
      );
      assetNames.push('sober-coffee');
      const colorSnapshots = [
        buildIosSoberWidgetSnapshot([{ ...sobers[0], icon_color: 'theme' }], [], 'pink'),
        buildIosSoberWidgetSnapshot([{ ...sobers[0], icon_color: 'coral' }], [], 'pink'),
        ...[undefined, null, 'invalid', '#123456zz', '#123'].map((iconColor) => ({
          ...snapshot,
          records: [{ ...snapshot.records[0], iconColor }],
        })),
        { ...snapshot, accents: {}, records: [{ ...snapshot.records[0], iconColor: undefined }] },
      ].map((value) => JSON.stringify(value));
      const fixture = {
        snapshot,
        dates,
        invalid,
        iconSnapshots,
        colorSnapshots,
        fonts: fontFiles.map((name) => realpathSync(join(root, 'targets/sober-widget', name))),
      };
      writeFileSync(join(temp, 'fixture.json'), JSON.stringify(fixture));
      execFileSync(
        'xcrun',
        [
          'swiftc',
          '-module-cache-path',
          join(temp, 'cache'),
          join(root, 'targets/sober-widget/SoberWidgetData.swift'),
          join(root, 'targets/sober-widget/SoberWidgetIcons.swift'),
          join(root, 'tests/native/SoberWidgetDataProbe.swift'),
          '-o',
          join(temp, 'probe'),
        ],
        { timeout: 90000 },
      );
      const result = JSON.parse(
        execFileSync(join(temp, 'probe'), [join(temp, 'fixture.json')], { encoding: 'utf8' }),
      );
      const expected = sobers.flatMap((sober) =>
        dates.map((date) => {
          const summary = getSoberSummary(
            sober,
            restarts.filter((item) => item.sober_id === sober.id),
            date * 1000,
          );
          return {
            id: sober.id,
            date,
            elapsed: formatSoberDuration(summary.duration),
            goal: formatSoberGoal(summary.goalDays),
            progress: summary.progress,
          };
        }),
      );
      assert.deepEqual(result.summaries, expected);
      assert.deepEqual(result.assetNames, assetNames);
      assert.deepEqual(result.iconColors, [
        ACCENT_PALETTES.pink.accent,
        HABIT_ICON_COLORS.coral.value,
        ...Array(6).fill(ACCENT_PALETTES.blue.accent),
      ]);
      assert.deepEqual(
        result.invalidAccepted,
        invalid.map(() => false),
      );
      assert.equal(result.defaultId, 1);
      assert.equal(result.deletedSelectionIsEmpty, true);
      assert.deepEqual(result.fontNames, [
        'TmoneyRoundWind-Regular',
        'TmoneyRoundWind-ExtraBold',
        'Ionicons',
        'MaterialDesignIcons',
      ]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  },
);

test(
  'iOS widget icon catalog compiles all selectable icons as transparent templates',
  {
    skip: process.platform !== 'darwin',
    timeout: 90000,
  },
  () => {
    const temp = mkdtempSync(join(tmpdir(), 'took-widget-catalog-test-'));
    try {
      execFileSync(
        'xcrun',
        [
          'actool',
          join(root, 'targets/sober-widget/Assets.xcassets'),
          '--compile',
          temp,
          '--platform',
          'iphoneos',
          '--minimum-deployment-target',
          '17.0',
          '--target-device',
          'iphone',
          '--output-format',
          'human-readable-text',
          '--output-partial-info-plist',
          join(temp, 'Info.plist'),
        ],
        { timeout: 60000, stdio: 'pipe' },
      );
      const entries = JSON.parse(
        execFileSync('xcrun', ['assetutil', '--info', join(temp, 'Assets.car')], {
          encoding: 'utf8',
        }),
      );
      const primary = entries.find((entry: any) => entry.Name === 'WidgetTextPrimaryLight');
      assert.equal(primary?.AssetType, 'Color');
      const tokens = JSON.parse(readFileSync(join(root, 'src/theme/tokens.json'), 'utf8'));
      const hex = tokens.colorValues[tokens.colors.light.textPrimary];
      for (const [index, start] of [1, 3, 5].entries()) {
        assert(
          Math.abs(
            primary['Color components'][index] - parseInt(hex.slice(start, start + 2), 16) / 255,
          ) < 0.000001,
        );
      }
      for (const key of Object.keys(SOBER_ICONS)) {
        const icon = entries.find((entry: any) => entry.Name === `sober-${key}`);
        assert(icon, `Missing compiled icon: ${key}`);
        assert.equal(icon['Template Mode'], 'template');
        assert.equal(icon.Opaque, false);
      }
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  },
);
