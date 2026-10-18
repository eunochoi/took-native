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
} from '../src/domain/sober';
import { buildIosSoberWidgetSnapshot } from '../src/widgets/sober/ios/snapshot';

const root = fileURLToPath(new URL('../', import.meta.url));

test('iOS widget and host declare the same App Group and extension credentials', () => {
  const require = createRequire(import.meta.url);
  const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
  const target = require('../targets/sober-widget/expo-target.config.js')(config);
  const group = config.ios.infoPlist.TookWidgetAppGroup;
  assert.deepEqual(target.entitlements['com.apple.security.application-groups'], [group]);
  const extension = readFileSync(join(root, 'targets/sober-widget/Info.plist'), 'utf8');
  assert(extension.includes(`<string>${group}</string>`));
  assert.equal(target.bundleIdentifier, '.sober-widget');
  assert.equal(target.deploymentTarget, '17.0');
});

test(
  'Swift widget calculations match the app at restart, goal and year boundaries',
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
      const fixture = {
        snapshot,
        dates,
        invalid,
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
