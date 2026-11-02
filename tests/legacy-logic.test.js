const assert = require('assert');
const L = require('../legacy/logic.js');

const days = (...d) => ({ schedule: { type: 'days', days: d } });
const count = (perWeek) => ({ schedule: { type: 'count', perWeek } });
const keys = (...k) => new Set(k);

// 2026-11-02 is a Monday.
const tests = {
  'day keys cross month and year ends': () => {
    assert.equal(L.addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(L.addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(L.addDays('2028-02-28', 1), '2028-02-29');
  },
  'weeks start on Monday': () => {
    assert.equal(L.weekStart('2026-11-02'), '2026-11-02');
    assert.equal(L.weekStart('2026-11-08'), '2026-11-02');
    assert.equal(L.weekStart('2026-11-09'), '2026-11-09');
  },
  'exact-day task is due only on its days': () => {
    const t = days(1, 3, 5);
    assert.equal(L.isDue(t, keys(), '2026-11-02'), true);
    assert.equal(L.isDue(t, keys(), '2026-11-03'), false);
  },
  'weekly task leaves the list once the number is reached, except on the day it was done': () => {
    const t = count(2);
    assert.equal(L.isDue(t, keys('2026-11-02'), '2026-11-03'), true);
    assert.equal(L.isDue(t, keys('2026-11-02', '2026-11-03'), '2026-11-03'), true);
    assert.equal(L.isDue(t, keys('2026-11-02', '2026-11-03'), '2026-11-04'), false);
    assert.equal(L.isDue(t, keys('2026-11-02', '2026-11-03'), '2026-11-09'), true);
  },
  'no completions means no streak': () => {
    assert.deepEqual(L.streak(days(1), keys(), '2026-11-02'), { current: 0, best: 0 });
  },
  'non-scheduled days do not break a day streak': () => {
    const t = days(1, 3, 5);
    assert.equal(L.streak(t, keys('2026-11-02', '2026-11-04', '2026-11-06'), '2026-11-08').current, 3);
  },
  'an unfinished today does not break a day streak': () => {
    const t = days(1, 3);
    assert.equal(L.streak(t, keys('2026-11-02', '2026-11-04'), '2026-11-09').current, 2);
  },
  'a missed scheduled day resets the streak but keeps the best': () => {
    const t = days(1, 3, 5);
    const done = keys('2026-11-02', '2026-11-04', '2026-11-09');
    assert.deepEqual(L.streak(t, done, '2026-11-09'), { current: 1, best: 2 });
  },
  'a missed day that has passed ends the current streak': () => {
    const t = days(1);
    assert.equal(L.streak(t, keys('2026-11-02'), '2026-11-10').current, 0);
  },
  'day streak crosses a month end': () => {
    const t = days(0, 1, 2, 3, 4, 5, 6);
    assert.equal(L.streak(t, keys('2026-10-31', '2026-11-01', '2026-11-02'), '2026-11-02').current, 3);
  },
  'weekly streak counts weeks reaching the number': () => {
    const t = count(2);
    const done = keys('2026-10-19', '2026-10-20', '2026-10-26', '2026-10-27');
    assert.equal(L.streak(t, done, '2026-11-02').current, 2);
  },
  'the current week extends but never breaks a weekly streak': () => {
    const t = count(2);
    const done = keys('2026-10-26', '2026-10-27', '2026-11-02', '2026-11-03');
    assert.equal(L.streak(t, done, '2026-11-03').current, 2);
    assert.equal(L.streak(t, keys('2026-10-26', '2026-10-27'), '2026-11-08').current, 1);
  },
  'a short past week resets the weekly streak': () => {
    const t = count(2);
    const done = keys('2026-10-19', '2026-10-20', '2026-10-26');
    assert.deepEqual(L.streak(t, done, '2026-11-02'), { current: 0, best: 1 });
  },
  'week progress counts only scheduled days for exact-day tasks': () => {
    assert.deepEqual(L.weekProgress(days(1, 3), keys('2026-11-02', '2026-11-03'), '2026-11-04'), { done: 1, target: 2 });
    assert.deepEqual(L.weekProgress(count(3), keys('2026-11-02', '2026-10-30'), '2026-11-04'), { done: 1, target: 3 });
  },
  'done line compares with the usual time': () => {
    const at = new Date(2026, 10, 2, 17, 48);
    assert.equal(L.doneLine({}, at), 'Done at 5:48 PM');
    assert.equal(L.doneLine({ usualTime: '18:00' }, at), 'Done at 5:48 PM, 12 min earlier than usual');
    assert.equal(L.doneLine({ usualTime: '16:30' }, at), 'Done at 5:48 PM, 1 hr 18 min later than usual');
    assert.equal(L.doneLine({ usualTime: '17:48' }, at), 'Done at 5:48 PM, right on time');
  },
  'clock handles midnight and noon': () => {
    assert.equal(L.clock(0), '12:00 AM');
    assert.equal(L.clock(12 * 60), '12:00 PM');
    assert.equal(L.clock(13 * 60 + 5), '1:05 PM');
  },
  'average time and schedule labels': () => {
    const c = (h) => ({ completedAt: new Date(2026, 10, 2, h).toISOString() });
    assert.equal(L.averageTime([c(10), c(12)]), 11 * 60);
    assert.equal(L.averageTime([]), null);
    assert.equal(L.scheduleLabel({ type: 'days', days: [5, 1, 0] }), 'Mon, Fri, Sun');
    assert.equal(L.scheduleLabel({ type: 'days', days: [0, 1, 2, 3, 4, 5, 6] }), 'Every day');
    assert.equal(L.scheduleLabel({ type: 'count', perWeek: 3 }), '3 times a week');
  },
  'heatmap starts on a Monday and ends today': () => {
    const cells = L.heatmap([{ dayKey: '2026-11-03' }, { dayKey: '2026-11-03' }], '2026-11-04', 2);
    assert.equal(cells[0].key, '2026-10-26');
    assert.equal(cells[cells.length - 1].key, '2026-11-04');
    assert.equal(cells.find((c) => c.key === '2026-11-03').count, 2);
  },
  'task validation': () => {
    const base = { name: 'Gym', schedule: { type: 'days', days: [1] }, focusMinutes: 0 };
    assert.equal(L.taskError(base), '');
    assert.ok(L.taskError({ ...base, name: '  ' }));
    assert.ok(L.taskError({ ...base, schedule: { type: 'days', days: [] } }));
    assert.ok(L.taskError({ ...base, schedule: { type: 'count', perWeek: 8 } }));
    assert.ok(L.taskError({ ...base, focusMinutes: 500 }));
  },
};

let failed = 0;
Object.entries(tests).forEach(([name, run]) => {
  try {
    run();
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + '\n  ' + err.message);
  }
});
console.log((Object.keys(tests).length - failed) + ' of ' + Object.keys(tests).length + ' passed');
process.exit(failed ? 1 : 0);
