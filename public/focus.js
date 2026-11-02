// Full-screen countdown for one task. The end time is saved, so a reload or a locked
// phone picks the timer back up instead of losing it.
const Focus = (function () {
  const KEY = 'lockin-focus';
  const box = document.getElementById('focus');
  let current = null;
  let timer = null;
  let wakeLock = null;
  let audio = null;
  let onFinish = null;

  function saved() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  }

  function remember(value) {
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } catch {
      // The timer still runs for this visit without saved state.
    }
  }

  function keepAwake() {
    if (!navigator.wakeLock || !current) return;
    navigator.wakeLock.request('screen').then((lock) => { wakeLock = lock; }).catch(function () {});
  }

  function chime() {
    if (!audio) return;
    [523, 659, 784].forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const at = audio.currentTime + i * 0.18;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.6);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.6);
    });
  }

  function digits(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + s;
  }

  function tick() {
    const left = current.endsAt - Date.now();
    if (left <= 0) {
      finish(current.minutes, new Date(current.endsAt), true);
      return;
    }
    box.querySelector('.focus-time').textContent = digits(left);
    const spent = 1 - left / (current.minutes * 60000);
    box.querySelector('.focus-bar span').style.width = spent * 100 + '%';
    document.title = digits(left) + ' · Lock In';
  }

  function close() {
    clearInterval(timer);
    current = null;
    remember(null);
    if (wakeLock) wakeLock.release().catch(function () {});
    wakeLock = null;
    box.hidden = true;
    box.innerHTML = '';
    document.title = 'Lock In';
  }

  function finish(minutes, at, ended) {
    const taskId = current.taskId;
    close();
    if (ended) chime();
    onFinish(taskId, at, minutes);
  }

  function show() {
    box.hidden = false;
    box.innerHTML =
      '<p class="focus-label">Locked in on</p>' +
      '<h2 class="focus-task"></h2>' +
      '<p class="focus-time" aria-live="off"></p>' +
      '<div class="focus-bar"><span></span></div>' +
      '<div class="focus-actions" data-panel="run">' +
        '<button type="button" class="btn quiet" data-focus="leave">Leave</button>' +
      '</div>' +
      '<div class="focus-actions" data-panel="leave" hidden>' +
        '<p>Leave this session?</p>' +
        '<button type="button" class="btn primary" data-focus="stay">Keep going</button>' +
        '<button type="button" class="btn quiet" data-focus="done">Mark task done</button>' +
        '<button type="button" class="btn quiet" data-focus="quit">Leave without recording</button>' +
      '</div>';
    box.querySelector('.focus-task').textContent = current.name;
    keepAwake();
    timer = setInterval(tick, 250);
    tick();
  }

  function setPanel(name) {
    box.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  }

  box.addEventListener('click', function (e) {
    const action = e.target.dataset.focus;
    if (action === 'leave') setPanel('leave');
    if (action === 'stay') setPanel('run');
    if (action === 'quit') close();
    if (action === 'done') {
      const spent = current.minutes * 60000 - (current.endsAt - Date.now());
      finish(Math.max(1, Math.round(spent / 60000)), new Date(), false);
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && current) keepAwake();
  });

  function start(task) {
    if (window.AudioContext) audio = audio || new AudioContext();
    current = {
      taskId: task.id,
      name: task.name,
      minutes: task.focusMinutes,
      endsAt: Date.now() + task.focusMinutes * 60000,
    };
    remember(current);
    show();
  }

  // Picks up a timer left running. One that ran out while away still counts.
  function resume() {
    const value = saved();
    if (!value || current) return;
    current = value;
    show();
  }

  return {
    start,
    resume,
    onFinish: (fn) => { onFinish = fn; },
    clear: () => { if (current || saved()) { current = current || saved(); close(); } },
  };
})();
