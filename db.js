/* リピ買い：保存と共通ロジック（画面とサービスワーカーの両方で使う） */
(function (g) {
  'use strict';
  var DB_NAME = 'ripikai';
  var STORE = 'kv';
  var KEY = 'state';

  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  async function load() {
    try {
      var db = await open();
      return await new Promise(function (res, rej) {
        var q = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        q.onsuccess = function () { res(q.result || null); };
        q.onerror = function () { rej(q.error); };
      });
    } catch (e) { return null; }
  }

  async function save(state) {
    try {
      var db = await open();
      await new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = res;
        tx.onerror = function () { rej(tx.error); };
      });
      return true;
    } catch (e) { return false; }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function toUTC(s) {
    var p = s.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }
  function addDays(s, n) {
    var t = new Date(toUTC(s) + n * 86400000);
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  /* a - b を日数で */
  function diffDays(a, b) { return Math.round((toUTC(a) - toUTC(b)) / 86400000); }

  function lastPurchase(item) {
    if (!item.history || !item.history.length) return null;
    return item.history.reduce(function (m, h) { return h.date > m ? h.date : m; }, item.history[0].date);
  }

  function dueInfo(item, today) {
    today = today || todayStr();
    var last = lastPurchase(item);
    var due = last ? addDays(last, item.cycle || 1) : today;
    if (item.snoozeUntil && item.snoozeUntil > due) due = item.snoozeUntil;
    return { last: last, due: due, left: diffDays(due, today) };
  }

  /* 通知しない時間帯か（例：22時〜9時） */
  function isQuiet(settings, date) {
    var h = (date || new Date()).getHours();
    var s = settings.quietStart, e = settings.quietEnd;
    if (s === e) return false;
    return s < e ? (h >= s && h < e) : (h >= s || h < e);
  }

  function notifyTargets(state, now) {
    now = now || new Date();
    var today = todayStr(now);
    var notified = state.notified || {};
    return state.items.filter(function (it) {
      if (!it.must || !it.history || !it.history.length) return false;
      var before = typeof it.notifyBefore === 'number' ? it.notifyBefore : 1;
      return dueInfo(it, today).left <= before && notified[it.id] !== today;
    });
  }

  g.RepiDB = { load: load, save: save };
  g.RepiCore = {
    todayStr: todayStr, addDays: addDays, diffDays: diffDays, lastPurchase: lastPurchase,
    dueInfo: dueInfo, isQuiet: isQuiet, notifyTargets: notifyTargets
  };
})(self);
