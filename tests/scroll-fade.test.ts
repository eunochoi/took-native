import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getScrollFadeState } from '../src/hooks/scrollFade';

test('short content and unmeasured viewport never display edge fades', () => {
  for (const [offset, viewport, content] of [
    [0, 0, 900],
    [20, 800, 200],
    [0, 800, 800],
    [100, 800, 804],
  ]) {
    assert.deepEqual(getScrollFadeState(offset, viewport, content), {
      topVisible: false,
      bottomVisible: false,
    });
  }
});
test('top, middle and bottom use the threshold independently', () => {
  assert.deepEqual(getScrollFadeState(0, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(6, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(7, 800, 1600), {
    topVisible: true,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(794, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
  assert.deepEqual(getScrollFadeState(800, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
});
test('overscroll and content shrink cannot leave false boundaries visible', () => {
  assert.deepEqual(getScrollFadeState(-50, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(900, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
  assert.deepEqual(getScrollFadeState(700, 800, 300), {
    topVisible: false,
    bottomVisible: false,
  });
});
