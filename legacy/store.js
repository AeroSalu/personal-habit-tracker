// Firestore access. Everything lives under users/{uid}. Writes are not awaited by the
// screens: the local cache updates listeners at once and syncs when there is signal.
const Store = (function () {
  let db = null;
  let userRef = null;
  let stopListening = [];

  function init() {
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
  }

  function watch(uid, onTasks, onCompletions, onError) {
    userRef = db.collection('users').doc(uid);
    const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    stopListening = [
      userRef.collection('tasks').onSnapshot((snap) => onTasks(rows(snap)), onError),
      userRef.collection('completions').onSnapshot((snap) => onCompletions(rows(snap)), onError),
    ];
  }

  function unwatch() {
    stopListening.forEach((stop) => stop());
    stopListening = [];
    userRef = null;
  }

  function saveTask(id, fields) {
    const tasks = userRef.collection('tasks');
    if (id) return tasks.doc(id).update(fields);
    return tasks.add({ ...fields, archived: false, createdAt: new Date().toISOString() });
  }

  function setArchived(id, archived) {
    return userRef.collection('tasks').doc(id).update({ archived });
  }

  function completionId(taskId, key) {
    return taskId + '_' + key;
  }

  function complete(taskId, completedAt, source, focusMinutes) {
    const key = Logic.dayKey(completedAt);
    return userRef.collection('completions').doc(completionId(taskId, key)).set({
      taskId,
      dayKey: key,
      completedAt: completedAt.toISOString(),
      source,
      focusMinutes,
    });
  }

  function undo(taskId, key) {
    return userRef.collection('completions').doc(completionId(taskId, key)).delete();
  }

  return { init, watch, unwatch, saveTask, setArchived, complete, undo };
})();
