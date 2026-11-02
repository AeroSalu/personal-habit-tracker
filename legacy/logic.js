// Pure schedule, streak and stats rules. No Firebase or DOM here, so tests/logic.test.js
// can run it directly in Node. Day keys are local dates written as YYYY-MM-DD.
(function (root) {
  const pad = (n) => String(n).padStart(2, '0');

  function dayKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseDay(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  }

  function addDays(key, n) {
    const date = parseDay(key);
    date.setDate(date.getDate() + n);
    return dayKey(date);
  }

  // 0 is Sunday, matching Date.getDay and the stored schedule.days values.
  function weekday(key) {
    return parseDay(key).getDay();
  }

  // Weeks run Monday to Sunday.
  function weekStart(key) {
    return addDays(key, -((weekday(key) + 6) % 7));
  }

  function keysFor(completions, taskId) {
    return new Set(completions.filter((c) => c.taskId === taskId).map((c) => c.dayKey));
  }

  function doneInWeek(keys, today) {
    const start = weekStart(today);
    const end = addDays(start, 6);
    return [...keys].filter((k) => k >= start && k <= end).length;
  }

  function isDue(task, keys, today) {
    if (task.schedule.type === 'days') return task.schedule.days.includes(weekday(today));
    return keys.has(today) || doneInWeek(keys, today) < task.schedule.perWeek;
  }

  // done and target for the week containing today.
  function weekProgress(task, keys, today) {
    if (task.schedule.type === 'count') {
      return { done: doneInWeek(keys, today), target: task.schedule.perWeek };
    }
    const scheduled = [...keys].filter((k) => task.schedule.days.includes(weekday(k)));
    return { done: doneInWeek(new Set(scheduled), today), target: task.schedule.days.length };
  }

  function runs(hits) {
    let best = 0;
    let run = 0;
    hits.forEach((hit) => {
      run = hit ? run + 1 : 0;
      best = Math.max(best, run);
    });
    return { current: run, best };
  }

  // A period still in progress can extend a streak but never breaks one.
  function dayStreak(task, keys, today) {
    const first = [...keys].sort()[0];
    const hits = [];
    for (let k = first; k < today; k = addDays(k, 1)) {
      if (task.schedule.days.includes(weekday(k))) hits.push(keys.has(k));
    }
    if (keys.has(today) && task.schedule.days.includes(weekday(today))) hits.push(true);
    return runs(hits);
  }

  function weekStreak(task, keys, today) {
    const current = weekStart(today);
    const hits = [];
    for (let w = weekStart([...keys].sort()[0]); w < current; w = addDays(w, 7)) {
      hits.push(doneInWeek(keys, w) >= task.schedule.perWeek);
    }
    if (doneInWeek(keys, today) >= task.schedule.perWeek) hits.push(true);
    return runs(hits);
  }

  function streak(task, keys, today) {
    if (!keys.size) return { current: 0, best: 0 };
    return task.schedule.type === 'days' ? dayStreak(task, keys, today) : weekStreak(task, keys, today);
  }

  function streakLabel(task, count) {
    const unit = task.schedule.type === 'days' ? 'day' : 'week';
    return count + ' ' + unit + (count === 1 ? '' : 's');
  }

  function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function parseUsual(usualTime) {
    const [h, m] = usualTime.split(':').map(Number);
    return h * 60 + m;
  }

  function clock(minutes) {
    const h = Math.floor(minutes / 60);
    return ((h + 11) % 12) + 1 + ':' + pad(minutes % 60) + (h < 12 ? ' AM' : ' PM');
  }

  function span(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return m + ' min';
    return h + ' hr' + (m ? ' ' + m + ' min' : '');
  }

  // "Done at 5:48 PM, 12 min earlier than usual"
  function doneLine(task, completedAt) {
    const at = minutesOfDay(completedAt);
    const line = 'Done at ' + clock(at);
    if (!task.usualTime) return line;
    const diff = at - parseUsual(task.usualTime);
    if (diff === 0) return line + ', right on time';
    return line + ', ' + span(Math.abs(diff)) + (diff < 0 ? ' earlier' : ' later') + ' than usual';
  }

  function averageTime(completions) {
    if (!completions.length) return null;
    const total = completions.reduce((sum, c) => sum + minutesOfDay(new Date(c.completedAt)), 0);
    return Math.round(total / completions.length);
  }

  function scheduleLabel(schedule) {
    if (schedule.type === 'count') {
      return schedule.perWeek === 1 ? 'Once a week' : schedule.perWeek + ' times a week';
    }
    if (schedule.days.length === 7) return 'Every day';
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return [1, 2, 3, 4, 5, 6, 0].filter((d) => schedule.days.includes(d)).map((d) => names[d]).join(', ');
  }

  // Monday-first cells for the last few weeks, ending today.
  function heatmap(completions, today, weeks) {
    const counts = {};
    completions.forEach((c) => { counts[c.dayKey] = (counts[c.dayKey] || 0) + 1; });
    const cells = [];
    for (let k = addDays(weekStart(today), -7 * (weeks - 1)); k <= today; k = addDays(k, 1)) {
      cells.push({ key: k, count: counts[k] || 0 });
    }
    return cells;
  }

  function taskError(fields) {
    if (!fields.name.trim()) return 'Give the task a name.';
    if (fields.schedule.type === 'days' && !fields.schedule.days.length) return 'Pick at least one day.';
    const perWeek = fields.schedule.perWeek;
    if (fields.schedule.type === 'count' && !(perWeek >= 1 && perWeek <= 7)) return 'Choose 1 to 7 times a week.';
    if (fields.focusMinutes && !(fields.focusMinutes >= 1 && fields.focusMinutes <= 480)) {
      return 'Focus length must be 1 to 480 minutes.';
    }
    return '';
  }

  const Logic = {
    dayKey, parseDay, addDays, weekday, weekStart, keysFor, isDue, weekProgress, streak, streakLabel,
    minutesOfDay, clock, span, doneLine, averageTime, parseUsual, scheduleLabel, heatmap, taskError,
  };

  if (typeof module !== 'undefined') module.exports = Logic;
  else root.Logic = Logic;
})(this);
