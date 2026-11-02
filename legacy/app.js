// Screens and event handling. Data arrives through Store listeners and each change
// redraws #app. Forms live in #sheet, so a sync never wipes what is being typed.
(function () {
  const app = document.getElementById('app');
  const sheet = document.getElementById('sheet');
  const toastBox = document.getElementById('toast');

  const DAYS = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const HEATMAP_WEEKS = 16;

  let user = null;
  let tasks = [];
  let completions = [];
  let tab = 'today';
  let authMode = 'signin';
  let authError = '';
  let justDone = '';
  let installEvent = null;
  let toastTimer = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const today = () => Logic.dayKey(new Date());
  const activeTasks = () => tasks.filter((t) => !t.archived);
  const taskById = (id) => tasks.find((t) => t.id === id);
  const keysOf = (task) => Logic.keysFor(completions, task.id);
  const completionOn = (task, key) => completions.find((c) => c.taskId === task.id && c.dayKey === key);

  function byUsualTime(a, b) {
    return (a.usualTime || '99').localeCompare(b.usualTime || '99') || a.name.localeCompare(b.name);
  }

  function toast(text) {
    clearTimeout(toastTimer);
    toastBox.textContent = text;
    toastBox.hidden = false;
    toastTimer = setTimeout(() => { toastBox.hidden = true; }, 4000);
  }

  function saveFailed() {
    toast('That change could not be saved. Try signing in again.');
  }

  // ---------- sign in ----------

  function renderAuth() {
    const resetting = authMode === 'reset';
    const heading = { signin: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }[authMode];
    const button = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset email' }[authMode];
    app.innerHTML =
      '<section class="auth">' +
        '<h1 class="wordmark">Lock In</h1>' +
        '<p class="auth-tag">Show up. Tick it off. Keep the streak.</p>' +
        '<h2>' + heading + '</h2>' +
        (resetting ? '' :
          '<button type="button" class="btn google" data-action="google">Continue with Google</button>' +
          '<p class="or"><span>or</span></p>') +
        '<form id="auth-form" novalidate>' +
          '<label for="email">Email</label>' +
          '<input id="email" type="email" autocomplete="email" required>' +
          (resetting ? '' :
            '<label for="password">Password</label>' +
            '<input id="password" type="password" required autocomplete="' +
              (authMode === 'signup' ? 'new-password' : 'current-password') + '">') +
          '<p class="form-error" id="auth-error">' + esc(authError) + '</p>' +
          '<button type="submit" class="btn primary">' + button + '</button>' +
        '</form>' +
        '<div class="auth-links">' +
          (authMode === 'signin'
            ? '<button type="button" class="link" data-action="auth-mode" data-mode="signup">Create an account</button>' +
              '<button type="button" class="link" data-action="auth-mode" data-mode="reset">Forgot password?</button>'
            : '<button type="button" class="link" data-action="auth-mode" data-mode="signin">Back to sign in</button>') +
        '</div>' +
      '</section>';
  }

  function submitAuth(form) {
    const email = form.querySelector('#email').value.trim();
    const password = authMode === 'reset' ? '' : form.querySelector('#password').value;
    const errorBox = form.querySelector('#auth-error');
    const button = form.querySelector('[type=submit]');
    errorBox.textContent = '';
    button.disabled = true;

    const done = authMode === 'signup' ? Auth.signUp(email, password)
      : authMode === 'reset' ? Auth.reset(email)
        : Auth.signIn(email, password);

    done.then(() => {
      if (authMode !== 'reset') return;
      authMode = 'signin';
      renderAuth();
      toast('Reset email sent, if that address has an account.');
    }).catch((err) => {
      errorBox.textContent = Auth.message(err);
      button.disabled = false;
    });
  }

  // ---------- today ----------

  function installNote() {
    if (installEvent) {
      return '<div class="note"><span>Install Lock In for one-tap access.</span>' +
        '<button type="button" class="btn small primary" data-action="install">Install app</button></div>';
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let hidden = false;
    try { hidden = localStorage.getItem('lockin-ios-hint') === '1'; } catch { hidden = false; }
    if (ios && !standalone && !hidden) {
      return '<div class="note"><span>To install: tap Share, then “Add to Home Screen”.</span>' +
        '<button type="button" class="btn small" data-action="hide-hint">Got it</button></div>';
    }
    return '';
  }

  function taskRow(task, key) {
    const keys = keysOf(task);
    const done = completionOn(task, key);
    const count = Logic.streak(task, keys, key).current;
    const meta = [];
    if (done) {
      meta.push(Logic.doneLine(task, new Date(done.completedAt)));
    } else {
      if (task.usualTime) meta.push('Usually ' + Logic.clock(Logic.parseUsual(task.usualTime)));
      if (task.schedule.type === 'count') {
        const week = Logic.weekProgress(task, keys, key);
        meta.push(week.done + ' of ' + week.target + ' this week');
      }
    }
    const pop = justDone === task.id ? ' pop' : '';
    return '<li class="task' + (done ? ' done' : '') + pop + '">' +
      '<button type="button" class="tick" data-action="toggle" data-id="' + esc(task.id) + '" aria-pressed="' + Boolean(done) + '" ' +
        'aria-label="' + (done ? 'Undo ' : 'Complete ') + esc(task.name) + '">' + CHECK + '</button>' +
      '<div class="task-text">' +
        '<p class="task-name">' + esc(task.name) + '</p>' +
        '<p class="task-meta">' + esc(meta.join(' · ')) + '</p>' +
      '</div>' +
      (count ? '<span class="streak" title="Current streak">' + esc(Logic.streakLabel(task, count)) + '</span>' : '') +
      (task.focusMinutes && !done
        ? '<button type="button" class="btn small" data-action="focus" data-id="' + esc(task.id) + '">Focus ' + task.focusMinutes + 'm</button>'
        : '') +
    '</li>';
  }

  function renderToday() {
    const key = today();
    const due = activeTasks().filter((t) => Logic.isDue(t, keysOf(t), key)).sort(byUsualTime);
    const doneCount = due.filter((t) => completionOn(t, key)).length;
    const share = due.length ? doneCount / due.length : 0;
    const date = Logic.parseDay(key).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    let body;
    if (!activeTasks().length) {
      body = '<div class="empty"><h3>Add your first task</h3>' +
        '<p>Pick something you want to do every week, like a workout, and how often you want to do it.</p>' +
        '<button type="button" class="btn primary" data-action="new-task">Add a task</button></div>';
    } else if (!due.length) {
      body = '<div class="empty"><h3>Nothing due today</h3><p>Your next tasks show up on their scheduled days.</p></div>';
    } else {
      body = '<ul class="tasks">' + due.map((t) => taskRow(t, key)).join('') + '</ul>';
    }

    return '<header class="head">' +
        '<p class="eyebrow">' + esc(date) + '</p>' +
        '<h1>' + (due.length && doneCount === due.length ? 'All done today' : 'Today') + '</h1>' +
        (due.length
          ? '<div class="meter" role="img" aria-label="' + doneCount + ' of ' + due.length + ' done"><span style="width:' + share * 100 + '%"></span></div>' +
            '<p class="meter-label">' + doneCount + ' of ' + due.length + ' done</p>'
          : '') +
      '</header>' + installNote() + body;
  }

  // ---------- tasks ----------

  function renderTasks() {
    const rows = (list) => list.slice().sort(byUsualTime).map((t) =>
      '<li><button type="button" class="task-link" data-action="edit-task" data-id="' + esc(t.id) + '">' +
        '<span class="task-name">' + esc(t.name) + '</span>' +
        '<span class="task-meta">' + esc([
          Logic.scheduleLabel(t.schedule),
          t.usualTime ? 'usually ' + Logic.clock(Logic.parseUsual(t.usualTime)) : '',
          t.focusMinutes ? t.focusMinutes + ' min focus' : '',
        ].filter(Boolean).join(' · ')) + '</span>' +
      '</button></li>').join('');
    const archived = tasks.filter((t) => t.archived);

    return '<header class="head row"><h1>Tasks</h1>' +
        '<button type="button" class="btn primary small" data-action="new-task">Add task</button></header>' +
      (activeTasks().length
        ? '<ul class="task-list">' + rows(activeTasks()) + '</ul>'
        : '<div class="empty"><p>No tasks yet.</p></div>') +
      (archived.length ? '<h2 class="section">Archived</h2><ul class="task-list">' + rows(archived) + '</ul>' : '') +
      '<div class="account"><p>Signed in as ' + esc(user.email || 'your account') + '</p>' +
        '<button type="button" class="btn small quiet" data-action="sign-out">Sign out</button></div>';
  }

  function dayPicker(selected) {
    return DAYS.map(([value, letter]) =>
      '<label class="day"><input type="checkbox" name="days" value="' + value + '"' +
        (selected.includes(value) ? ' checked' : '') + '><span>' + letter + '</span></label>').join('');
  }

  function openTaskForm(task) {
    const schedule = task ? task.schedule : { type: 'days', days: [] };
    const isCount = schedule.type === 'count';
    sheet.innerHTML =
      '<div class="scrim" data-action="close-sheet"></div>' +
      '<form class="panel" id="task-form" data-id="' + esc(task ? task.id : '') + '" novalidate>' +
        '<h2>' + (task ? 'Edit task' : 'New task') + '</h2>' +
        '<label for="task-name">Task</label>' +
        '<input id="task-name" maxlength="80" placeholder="Workout" value="' + esc(task ? task.name : '') + '">' +
        '<p class="label">How often</p>' +
        '<div class="switch">' +
          '<label><input type="radio" name="type" value="days"' + (isCount ? '' : ' checked') + '><span>Exact days</span></label>' +
          '<label><input type="radio" name="type" value="count"' + (isCount ? ' checked' : '') + '><span>Times a week</span></label>' +
        '</div>' +
        '<div class="days" id="pick-days"' + (isCount ? ' hidden' : '') + '>' + dayPicker(isCount ? [] : schedule.days) + '</div>' +
        '<div id="pick-count"' + (isCount ? '' : ' hidden') + '>' +
          '<label for="per-week">Times each week</label>' +
          '<input id="per-week" type="number" inputmode="numeric" min="1" max="7" value="' + (isCount ? schedule.perWeek : 3) + '">' +
        '</div>' +
        '<div class="two">' +
          '<div><label for="usual-time">Usual time (optional)</label>' +
            '<input id="usual-time" type="time" value="' + esc(task ? task.usualTime : '') + '"></div>' +
          '<div><label for="focus-minutes">Focus minutes (optional)</label>' +
            '<input id="focus-minutes" type="number" inputmode="numeric" min="1" max="480" value="' + (task && task.focusMinutes ? task.focusMinutes : '') + '"></div>' +
        '</div>' +
        '<p class="form-error" id="task-error"></p>' +
        '<div class="panel-actions">' +
          '<button type="submit" class="btn primary">Save task</button>' +
          '<button type="button" class="btn quiet" data-action="close-sheet">Cancel</button>' +
          (task ? '<button type="button" class="btn quiet" data-action="archive" data-id="' + esc(task.id) + '">' +
            (task.archived ? 'Restore task' : 'Archive task') + '</button>' : '') +
        '</div>' +
      '</form>';
  }

  function closeSheet() {
    sheet.innerHTML = '';
  }

  function submitTask(form) {
    const type = form.querySelector('[name=type]:checked').value;
    const fields = {
      name: form.querySelector('#task-name').value.trim(),
      schedule: type === 'days'
        ? { type, days: [...form.querySelectorAll('[name=days]:checked')].map((d) => Number(d.value)) }
        : { type, perWeek: Number(form.querySelector('#per-week').value) },
      usualTime: form.querySelector('#usual-time').value,
      focusMinutes: Number(form.querySelector('#focus-minutes').value) || 0,
    };
    const error = Logic.taskError(fields);
    if (error) {
      form.querySelector('#task-error').textContent = error;
      return;
    }
    Store.saveTask(form.dataset.id, fields).catch(saveFailed);
    closeSheet();
  }

  // ---------- record ----------

  function heatmapHtml(key) {
    const cells = Logic.heatmap(completions, key, HEATMAP_WEEKS);
    const level = (n) => Math.min(n, 3);
    return '<div class="heat" role="img" aria-label="Completions per day for the last ' + HEATMAP_WEEKS + ' weeks">' +
      cells.map((c) => '<span class="l' + level(c.count) + '" title="' + c.key + ': ' + c.count + ' done"></span>').join('') +
    '</div>';
  }

  function taskStats(task, key) {
    const keys = keysOf(task);
    const run = Logic.streak(task, keys, key);
    const week = Logic.weekProgress(task, keys, key);
    const average = Logic.averageTime(completions.filter((c) => c.taskId === task.id));
    const lines = [Logic.scheduleLabel(task.schedule), 'This week: ' + week.done + ' of ' + week.target];
    if (average !== null) {
      lines.push('Average finish ' + Logic.clock(average) +
        (task.usualTime ? ' (usually ' + Logic.clock(Logic.parseUsual(task.usualTime)) + ')' : ''));
    }
    return '<li class="stat-row">' +
      '<div><p class="task-name">' + esc(task.name) + '</p>' +
        lines.map((l) => '<p class="task-meta">' + esc(l) + '</p>').join('') + '</div>' +
      '<div class="stat-streak"><strong>' + run.current + '</strong><span>streak</span>' +
        '<small>best ' + esc(Logic.streakLabel(task, run.best)) + '</small></div>' +
    '</li>';
  }

  function historyRow(c) {
    const task = taskById(c.taskId);
    const at = new Date(c.completedAt);
    const date = Logic.parseDay(c.dayKey).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return '<li><span class="when">' + esc(date) + ', ' + esc(Logic.clock(Logic.minutesOfDay(at))) + '</span>' +
      '<span>' + esc(task ? task.name : 'Deleted task') + '</span>' +
      (c.focusMinutes ? '<span class="task-meta">' + c.focusMinutes + ' min focus</span>' : '') + '</li>';
  }

  function renderRecord() {
    const key = today();
    const weeks = activeTasks().map((t) => Logic.weekProgress(t, keysOf(t), key));
    const done = weeks.reduce((sum, w) => sum + Math.min(w.done, w.target), 0);
    const target = weeks.reduce((sum, w) => sum + w.target, 0);
    const recent = completions.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 30);

    if (!completions.length) {
      return '<header class="head"><h1>Record</h1></header>' +
        '<div class="empty"><h3>Nothing recorded yet</h3><p>Complete a task and the time you finished shows up here.</p></div>';
    }

    return '<header class="head"><h1>Record</h1></header>' +
      '<div class="tiles">' +
        '<div><strong>' + (target ? Math.round(done / target * 100) : 0) + '%</strong><span>this week</span></div>' +
        '<div><strong>' + done + '/' + target + '</strong><span>done this week</span></div>' +
        '<div><strong>' + completions.length + '</strong><span>all time</span></div>' +
      '</div>' +
      '<h2 class="section">Last ' + HEATMAP_WEEKS + ' weeks</h2>' + heatmapHtml(key) +
      '<h2 class="section">Streaks</h2>' +
      '<ul class="stats">' + activeTasks().slice().sort(byUsualTime).map((t) => taskStats(t, key)).join('') + '</ul>' +
      '<h2 class="section">History</h2>' +
      '<ul class="history">' + recent.map(historyRow).join('') + '</ul>';
  }

  // ---------- shell ----------

  function render() {
    if (!user) {
      renderAuth();
      return;
    }
    const screens = { today: renderToday, tasks: renderTasks, record: renderRecord };
    const tabs = [['today', 'Today'], ['tasks', 'Tasks'], ['record', 'Record']];
    app.innerHTML = '<main class="screen">' + screens[tab]() + '</main>' +
      '<nav class="tabs" aria-label="Main">' + tabs.map(([id, label]) =>
        '<button type="button" data-action="tab" data-tab="' + id + '"' +
          (tab === id ? ' aria-current="page"' : '') + '>' + label + '</button>').join('') + '</nav>';
    justDone = '';
  }

  function complete(task, at, source, minutes) {
    justDone = task.id;
    Store.complete(task.id, at, source, minutes).catch(saveFailed);
    const keys = keysOf(task);
    keys.add(Logic.dayKey(at));
    const run = Logic.streak(task, keys, Logic.dayKey(at)).current;
    toast(Logic.doneLine(task, at) + (run > 1 ? '. Streak: ' + Logic.streakLabel(task, run) : ''));
  }

  function toggle(task) {
    const key = today();
    if (completionOn(task, key)) Store.undo(task.id, key).catch(saveFailed);
    else complete(task, new Date(), 'tap', 0);
  }

  const actions = {
    tab: (el) => { tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
    toggle: (el) => toggle(taskById(el.dataset.id)),
    focus: (el) => Focus.start(taskById(el.dataset.id)),
    'new-task': () => openTaskForm(null),
    'edit-task': (el) => openTaskForm(taskById(el.dataset.id)),
    'close-sheet': closeSheet,
    archive: (el) => {
      Store.setArchived(el.dataset.id, !taskById(el.dataset.id).archived).catch(saveFailed);
      closeSheet();
    },
    google: () => Auth.google().catch((err) => {
      authError = Auth.message(err);
      renderAuth();
    }),
    'auth-mode': (el) => { authMode = el.dataset.mode; authError = ''; renderAuth(); },
    'sign-out': () => Auth.signOut(),
    install: () => {
      installEvent.prompt();
      installEvent = null;
      render();
    },
    'hide-hint': () => {
      try { localStorage.setItem('lockin-ios-hint', '1'); } catch { /* shows again next visit */ }
      render();
    },
  };

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (el) actions[el.dataset.action](el);
  });

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'auth-form') submitAuth(e.target);
    if (e.target.id === 'task-form') submitTask(e.target);
  });

  document.addEventListener('change', function (e) {
    if (e.target.name !== 'type') return;
    sheet.querySelector('#pick-days').hidden = e.target.value !== 'days';
    sheet.querySelector('#pick-count').hidden = e.target.value !== 'count';
  });

  // A phone left open overnight should show the new day when it comes back.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && user) render();
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    if (user && tab === 'today') render();
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  Focus.onFinish(function (taskId, at, minutes) {
    const task = taskById(taskId);
    if (task) complete(task, at, 'focus', minutes);
  });

  function onUser(next) {
    if (user) Store.unwatch();
    user = next;
    tasks = [];
    completions = [];
    tab = 'today';
    closeSheet();
    if (!user) {
      Focus.clear();
      render();
      return;
    }
    let loaded = 0;
    const arrived = () => {
      loaded += 1;
      render();
      if (loaded === 2) Focus.resume();
    };
    render();
    Store.watch(user.uid,
      (rows) => { tasks = rows; arrived(); },
      (rows) => { completions = rows; arrived(); },
      () => toast('Your data could not be loaded. Sign out and back in.'));
  }

  Store.init();
  Auth.init(onUser, (text) => { authError = text; if (!user) renderAuth(); });
})();
