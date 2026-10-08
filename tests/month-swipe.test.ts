import { useCalendarNavigation } from './helpers/calendar-navigation';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { shiftMonth } from '../src/domain/date';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function swipe(month: string, minDate?: string, maxDate?: string) {
  const exports: any = {};
  let handlers: any;
  const changes: string[] = [];
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/hooks/useMonthSwipe.ts', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react') return { useCallback: (fn: any) => fn, useMemo: (fn: any) => fn() };
        if (name === 'react-native')
          return {
            PanResponder: {
              create: (props: any) => {
                handlers = props;
                return { panHandlers: props };
              },
            },
          };
        return { shiftMonth };
      },
    },
  );
  const navigation = useCalendarNavigation(month, (next) => changes.push(next), minDate, maxDate);
  const hook = exports.useMonthSwipe(navigation.changeMonth);
  return { ...handlers, ...hook, ...navigation, changes };
}
const gesture = (dx: number, dy = 0, touches = 1) => ({ dx, dy, numberActiveTouches: touches });

test('month swipe distinguishes horizontal gestures from taps, vertical scroll and multitouch', () => {
  const h = swipe('2026-10');
  assert.equal(h.onMoveShouldSetPanResponder(null, gesture(5)), false);
  assert.equal(h.onMoveShouldSetPanResponder(null, gesture(30, 40)), false);
  assert.equal(h.onMoveShouldSetPanResponder(null, gesture(30, 0, 2)), false);
  assert.equal(h.onMoveShouldSetPanResponder(null, gesture(30, 5)), true);
  h.onPanResponderRelease(null, gesture(79));
  assert.deepEqual(h.changes, []);
  h.onPanResponderRelease(null, gesture(100, 90));
  assert.deepEqual(h.changes, []);
  h.onPanResponderRelease(null, gesture(-80));
  assert.deepEqual(h.changes, ['2026-11']);
  h.onPanResponderRelease(null, gesture(80));
  assert.deepEqual(h.changes, ['2026-11', '2026-09']);
});

test('buttons and swipe share month boundaries and cross calendar years correctly', () => {
  const low = swipe('1900-01');
  low.changeMonth(-1);
  assert.deepEqual(low.changes, []);
  low.onPanResponderRelease(null, gesture(100));
  assert.deepEqual(low.changes, []);
  const high = swipe('2100-12');
  high.changeMonth(1);
  assert.deepEqual(high.changes, []);
  high.onPanResponderRelease(null, gesture(-100));
  assert.deepEqual(high.changes, []);
  const h = swipe('2026-12');
  h.changeMonth(1);
  assert.deepEqual(h.changes, ['2027-01']);
});


test('date bounds include endpoints and restrict buttons, swipe and direct month changes', () => {
  const first = swipe('2026-09', '2026-09-15', '2026-10-08');
  assert.equal(first.canGoPrevious, false);
  assert.equal(first.canGoNext, true);
  assert.equal(first.isDateAvailable('2026-09-14'), false);
  assert.equal(first.isDateAvailable('2026-09-15'), true);
  assert.equal(first.isDateAvailable('2026-10-08'), true);
  assert.equal(first.isDateAvailable('2026-10-09'), false);
  first.changeMonth(-1);
  first.onPanResponderRelease(null, gesture(100));
  first.changeToMonth('2026-08');
  assert.deepEqual(first.changes, []);
  first.changeMonth(1);
  assert.deepEqual(first.changes, ['2026-10']);
  const last = swipe('2026-10', '2026-09-15', '2026-10-08');
  assert.equal(last.canGoNext, false);
  last.changeMonth(1);
  last.onPanResponderRelease(null, gesture(-100));
  last.changeToMonth('2026-11');
  assert.deepEqual(last.changes, []);
});

test('a range within one month disables both directions and handles leap dates', () => {
  const h = swipe('2024-02', '2024-02-15', '2024-02-29');
  assert.equal(h.canGoPrevious, false);
  assert.equal(h.canGoNext, false);
  assert.equal(h.isDateAvailable('2024-02-29'), true);
  assert.equal(h.isDateAvailable('2024-02-30'), false);
  assert.equal(h.isDateAvailable('2024-03-01'), false);
});
