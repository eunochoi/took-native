import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import test from 'node:test';
import * as query from '@tanstack/react-query';
import { format } from 'date-fns';
import { database } from './database';
import { saveDiary } from '../src/db/diary';
import { deleteHabit, saveHabit, setHabitCompletion } from '../src/db/habit';
import { todayString } from '../src/domain/date';

const require = createRequire(new URL('../src/queries/index.ts', import.meta.url));
const ts = require('typescript');
const source = ts.transpileModule(
  readFileSync(new URL('../src/queries/index.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function loadQueries(client: query.QueryClient, overrides: Record<string, unknown> = {}) {
  const exports: Record<string, any> = {};
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === '@tanstack/react-query')
        return {
          ...query,
          useQueryClient: () => client,
          useMutation: (options: unknown) => options,
        };
      if (name === 'react' || name === 'react-native') return overrides[name] ?? {};
      if (name === '../widgets/sober')
        return overrides[name] ?? { refreshSoberWidgets: () => undefined };
      return overrides[name] ?? require(name);
    },
    ...(overrides.globals as object),
  });
  return exports;
}

// Build cache entries with the actual query factories, including diary queries that embed habits.
function cacheEntries(module: Record<string, any>) {
  const db = {};
  return {
    diaryList: module.diaryQueries.list(db, { year: null, month: 0, emotion: null, sort: 'DESC' }),
    diaryId: module.diaryQueries.byId(db, 1),
    diaryDate: module.diaryQueries.byDate(db, '2026-10-05'),
    diaryDetailDate: module.diaryQueries.detailByDate(db, '2026-10-05'),
    diaryMonth: module.diaryQueries.month(db, '2026-10'),
    habitList: module.habitQueries.list(db),
    habitId: module.habitQueries.byId(db, 1),
    completions: module.habitQueries.completions(db, '2026-10-02', '2026-10-05'),
    completionsByHabit: module.habitQueries.completionsByHabit(db, 1),
    soberList: module.soberQueries.list(db),
    soberId: module.soberQueries.byId(db, 1),
    soberRestarts: module.soberQueries.restarts(db),
    soberOwnRestarts: module.soberQueries.restarts(db, 1),
    diaryStats: module.statsQueries.diary(db, 2026),
    habitStats: module.statsQueries.habit(db, 2026),
    years: module.statsQueries.years(db),
  };
}

const habitDiary = ['diaryList', 'diaryId', 'diaryDetailDate'];
for (const [scope, affected] of Object.entries({
  diary: [
    'diaryList',
    'diaryId',
    'diaryDate',
    'diaryDetailDate',
    'diaryMonth',
    'diaryStats',
    'years',
  ],
  habit: [
    'habitList',
    'habitId',
    'completions',
    'completionsByHabit',
    ...habitDiary,
    'habitStats',
    'years',
  ],
  habitCompletion: ['completions', 'completionsByHabit', ...habitDiary, 'habitStats', 'years'],
  sober: ['soberList', 'soberId', 'soberRestarts', 'soberOwnRestarts'],
})) {
  test(`${scope} refreshes dependent active queries once and preserves unrelated caches`, async () => {
    const client = new query.QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    let widgetRefreshes = 0;
    const module = loadQueries(client, {
      '../widgets/sober': { refreshSoberWidgets: () => widgetRefreshes++ },
    });
    const entries = cacheEntries(module);
    const calls: Record<string, number> = {};
    const unsubscribe: (() => void)[] = [];
    try {
      for (const [name, options] of Object.entries(entries)) {
        calls[name] = 0;
        client.setQueryData(options.queryKey, 'before');
        const observer = new query.QueryObserver(client, {
          queryKey: options.queryKey,
          queryFn: async () => {
            calls[name]++;
            return 'after';
          },
        });
        unsubscribe.push(observer.subscribe(() => undefined));
      }
      // Inactive queries also become stale, but are not fetched until needed.
      const inactive = module.soberQueries.byId({}, 99).queryKey;
      client.setQueryData(inactive, 'before');
      let succeeded = false;
      const options = module.useRecordMutation(
        async () => 42,
        scope,
        (value: number) => {
          assert.equal(value, 42);
          for (const name of affected)
            assert.equal(
              client.getQueryData(entries[name as keyof typeof entries].queryKey),
              'after',
            );
          succeeded = true;
        },
      );
      assert.equal(await new query.MutationObserver(client, options).mutate(undefined), 42);
      assert(succeeded);
      assert.equal(widgetRefreshes, scope === 'sober' ? 1 : 0);
      for (const name of Object.keys(entries))
        assert.equal(calls[name], affected.includes(name) ? 1 : 0, name);
      assert.equal(client.getQueryState(inactive)?.isInvalidated, scope === 'sober');
      assert.equal(client.getQueryData(inactive), 'before');
    } finally {
      unsubscribe.forEach((stop) => stop());
      client.clear();
    }
  });
}

test('habit check, rename and deletion refresh the actual diary joins and statistics', async () => {
  const { db, raw } = await database();
  const client = new query.QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const module = loadQueries(client);
  const unsubscribe: (() => void)[] = [];
  try {
    const today = todayString();
    const year = Number(today.slice(0, 4));
    const habit = await saveHabit(db, { name: '걷기', priority: 1, icon_key: 'walking' });
    const diary = await saveDiary(db, { date: today, text: '오늘의 기록', emotion: 0, files: [] });
    const options = [
      module.diaryQueries.byId(db, diary.id),
      module.diaryQueries.detailByDate(db, today),
      module.habitQueries.completions(db, today, today),
      module.habitQueries.completionsByHabit(db, habit),
      module.statsQueries.habit(db, year),
    ];
    for (const entry of options) {
      await client.fetchQuery(entry);
      unsubscribe.push(new query.QueryObserver(client, entry).subscribe(() => undefined));
    }
    const mutate = (work: () => Promise<unknown>, scope: string) =>
      new query.MutationObserver(client, module.useRecordMutation(work, scope)).mutate(undefined);
    await mutate(() => setHabitCompletion(db, habit, today, true), 'habitCompletion');
    for (const entry of options.slice(0, 2))
      assert.equal((client.getQueryData(entry.queryKey) as any).completedHabits[0].id, habit);
    assert.equal((client.getQueryData(options[2].queryKey) as unknown[]).length, 1);
    assert.equal((client.getQueryData(options[3].queryKey) as unknown[]).length, 1);
    assert.equal((client.getQueryData(options[4].queryKey) as any).top[0].count, 1);
    await mutate(
      () => saveHabit(db, { id: habit, name: '산책', priority: 2, icon_key: 'walking' }),
      'habit',
    );
    for (const entry of options.slice(0, 2))
      assert.equal((client.getQueryData(entry.queryKey) as any).completedHabits[0].name, '산책');
    await mutate(() => deleteHabit(db, habit), 'habit');
    for (const entry of options.slice(0, 2))
      assert.equal((client.getQueryData(entry.queryKey) as any).completedHabits.length, 0);
    assert.equal((client.getQueryData(options[2].queryKey) as unknown[]).length, 0);
    assert.equal((client.getQueryData(options[4].queryKey) as any).top.length, 0);
  } finally {
    unsubscribe.forEach((stop) => stop());
    client.clear();
    raw.close();
  }
});

test('failed mutations keep caches and report the original error without a success callback', async () => {
  const client = new query.QueryClient();
  const module = loadQueries(client);
  const error = new Error('write failed');
  let reported: Error | null = null;
  let succeeded = false;
  client.setQueryData(['diary', 'id', 1], 'unchanged');
  try {
    const mutation = new query.MutationObserver(
      client,
      module.useRecordMutation(
        async () => {
          throw error;
        },
        'diary',
        () => {
          succeeded = true;
        },
        (value: Error) => {
          reported = value;
        },
      ),
    );
    await assert.rejects(mutation.mutate(undefined), (value) => value === error);
    assert.equal(reported, error);
    assert.equal(succeeded, false);
    assert.equal(client.getQueryState(['diary', 'id', 1])?.isInvalidated, false);
  } finally {
    client.clear();
  }
});

// A controlled clock runs the real useToday effect without loading the native React runtime.
function todayClock(instant: string, initialState: string | null = 'active') {
  let now = Date.parse(instant);
  let value = '';
  let cleanup: (() => void) | undefined;
  let listener: ((state: string) => void) | undefined;
  let nextId = 0;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  class ClockDate extends Date {
    constructor(input?: string | number | Date) {
      super(input === undefined ? now : input instanceof Date ? input.getTime() : input);
    }
    static now() {
      return now;
    }
  }
  const client = new query.QueryClient();
  const module = loadQueries(client, {
    react: {
      useState: (initial: () => string) => {
        value = initial();
        return [
          value,
          (next: string) => {
            value = next;
          },
        ];
      },
      useEffect: (effect: () => () => void) => {
        cleanup = effect();
      },
    },
    'react-native': {
      AppState: {
        currentState: initialState,
        addEventListener: (_event: string, next: typeof listener) => {
          listener = next;
          return {
            remove: () => {
              listener = undefined;
            },
          };
        },
      },
    },
    '../domain/date': { todayString: () => format(new ClockDate(), 'yyyy-MM-dd') },
    globals: {
      Date: ClockDate,
      setTimeout: (callback: () => void, delay: number) => {
        timers.set(++nextId, { callback, delay });
        return nextId;
      },
      clearTimeout: (id: number) => timers.delete(id),
    },
  });
  module.useToday();
  return {
    value: () => value,
    count: () => timers.size,
    delay: () => [...timers.values()][0]?.delay,
    change: (state: string, instant: string) => {
      now = Date.parse(instant);
      listener?.(state);
    },
    fire: () => {
      const entry = [...timers.values()][0];
      assert(entry);
      now += entry.delay;
      entry.callback();
    },
    stop: () => {
      cleanup?.();
      client.clear();
    },
    hasListener: () => !!listener,
  };
}

test('today updates at local midnight, reschedules once and pauses in the background', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Asia/Seoul';
  const clock = todayClock('2026-10-05T23:59:50+09:00');
  try {
    assert.equal(clock.value(), '2026-10-05');
    assert.equal(clock.delay(), 10_000);
    clock.fire();
    assert.equal(clock.value(), '2026-10-06');
    assert.equal(clock.count(), 1);
    assert.equal(clock.delay(), 24 * 3600000);
    clock.change('background', '2026-10-06T12:00:00+09:00');
    assert.equal(clock.count(), 0);
    clock.change('active', '2026-10-08T15:00:00+09:00');
    assert.equal(clock.value(), '2026-10-08');
    assert.equal(clock.delay(), 9 * 3600000);
    clock.change('active', '2026-10-08T16:00:00+09:00');
    assert.equal(clock.count(), 1);
    clock.stop();
    assert.equal(clock.count(), 0);
    assert.equal(clock.hasListener(), false);
  } finally {
    clock.stop();
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('today uses local calendar midnight across 23-hour and 25-hour DST days', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    for (const [instant, hours] of [
      ['2026-03-08T00:00:00-05:00', 23],
      ['2026-11-01T00:00:00-04:00', 25],
    ] as const) {
      const clock = todayClock(instant);
      try {
        assert.equal(clock.delay(), hours * 3600000);
      } finally {
        clock.stop();
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('today recomputes its local date and reservation after a timezone change on resume', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Asia/Seoul';
  const clock = todayClock('2026-10-05T16:00:00Z');
  try {
    assert.equal(clock.value(), '2026-10-06');
    clock.change('background', '2026-10-05T16:00:00Z');
    process.env.TZ = 'America/Los_Angeles';
    clock.change('active', '2026-10-05T16:00:00Z');
    assert.equal(clock.value(), '2026-10-05');
    assert.equal(clock.delay(), 15 * 3600000);
  } finally {
    clock.stop();
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('a today hook mounted in the background waits for resume to schedule its timer', () => {
  const clock = todayClock('2026-10-05T16:00:00Z', 'background');
  try {
    assert.equal(clock.count(), 0);
    clock.change('active', '2026-10-05T16:00:00Z');
    assert.equal(clock.count(), 1);
  } finally {
    clock.stop();
  }
});
