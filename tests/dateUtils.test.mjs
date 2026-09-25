// Smoke tests for pure date helpers. Run with: npm test
// Uses Node's built-in test runner and native TypeScript type stripping (Node >= 22.18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDaySuffix,
  formatDateForStorage,
  parseDateFromStorage,
  isToday,
  isYesterday,
  getRelativeDateString,
  formatDateForTitle,
} from '../src/utils/dateUtils.ts';

test('getDaySuffix handles st/nd/rd/th and the teens', () => {
  assert.equal(getDaySuffix(1), 'st');
  assert.equal(getDaySuffix(2), 'nd');
  assert.equal(getDaySuffix(3), 'rd');
  assert.equal(getDaySuffix(4), 'th');
  assert.equal(getDaySuffix(11), 'th');
  assert.equal(getDaySuffix(12), 'th');
  assert.equal(getDaySuffix(13), 'th');
  assert.equal(getDaySuffix(21), 'st');
  assert.equal(getDaySuffix(22), 'nd');
  assert.equal(getDaySuffix(23), 'rd');
  assert.equal(getDaySuffix(31), 'st');
});

test('storage format round-trips a UTC date', () => {
  const d = new Date('2026-09-25T00:00:00.000Z');
  const s = formatDateForStorage(d);
  assert.equal(s, '2026-09-25');
  assert.equal(parseDateFromStorage(s).toISOString(), d.toISOString());
});

test('isToday / isYesterday / relative strings', () => {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  assert.equal(isToday(now), true);
  assert.equal(isYesterday(yesterday), true);
  assert.equal(isToday(yesterday), false);
  assert.equal(getRelativeDateString(now), 'Today');
  assert.equal(getRelativeDateString(yesterday), 'Yesterday');
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  assert.equal(getRelativeDateString(threeWeeksAgo), '3 weeks ago');
});

test('formatDateForTitle adds an ordinal suffix', () => {
  const title = formatDateForTitle(new Date(2026, 8, 22));
  assert.match(title, /September 22nd$/);
});
