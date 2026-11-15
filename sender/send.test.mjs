// node --test send.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueSlots, slotOf } from './send.mjs'

const at = (h, m) => Date.UTC(2026, 10, 4, h, m)

test('slots round down to 15 minutes, matching the app', () => {
  assert.equal(slotOf(at(12, 44)), '2026-11-04T12:30Z')
  assert.equal(slotOf(at(12, 45)), '2026-11-04T12:45Z')
})

test('a first run only sends the current slot', () => {
  assert.deepEqual(dueSlots(at(12, 50), undefined), ['2026-11-04T12:45Z'])
})

test('a late run catches up on missed slots, but never more than an hour', () => {
  assert.deepEqual(dueSlots(at(12, 50), '2026-11-04T12:15Z'), ['2026-11-04T12:30Z', '2026-11-04T12:45Z'])
  assert.deepEqual(dueSlots(at(12, 50), '2026-11-04T08:00Z'), ['2026-11-04T12:00Z', '2026-11-04T12:15Z', '2026-11-04T12:30Z', '2026-11-04T12:45Z'])
})

test('nothing twice: a slot already sent is skipped', () => {
  assert.deepEqual(dueSlots(at(12, 50), '2026-11-04T12:45Z'), [])
})
