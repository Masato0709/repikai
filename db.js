/* リピ買い：保存と共通ロジック（画面とサービスワーカーの両方で使う） */
(function (g) {
  'use strict';
  var DB_NAME = 'ripikai';
  var STORE = 'kv';

  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  async function getKV(key) {
    try {
      var db = await open();
      return await new Promise(function (res, rej) {
        var q = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        q.onsuccess = function () { res(q.result === undefined ? null : q.result); };
        q.onerror = function () { rej(q.error); };
      });
    } catch (e) { return null; }
  }
  async function setKV(key, val) {
    try {
      var db = await open();
      await new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        if (val === null) tx.objectStore(STORE).delete(key); else tx.objectStore(STORE).put(val, key);
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

  /* 最近買っていない：周期の2倍を過ぎ、かつ21日以上買っていない */
  var STALE_MIN_DAYS = 21;
  function isStale(item, today) {
    today = today || todayStr();
    if (!item.must) return false;
    var last = lastPurchase(item);
    if (!last) return false;
    if (item.snoozeUntil && item.snoozeUntil > today) return false;
    var elapsed = diffDays(today, last);
    return elapsed >= 2 * (item.cycle || 1) && elapsed >= STALE_MIN_DAYS;
  }

  /* 通知しない時間帯か（例：22時〜9時） */
  function isQuiet(settings, date) {
    var h = (date || new Date()).getHours();
    var s = settings.quietStart, e = settings.quietEnd;
    if (s === e) return false;
    return s < e ? (h >= s && h < e) : (h >= s || h < e);
  }

  function displayName(item) {
    var v = item.variants && item.variants.length ? item.variants : null;
    if (!v) return item.name || '';
    var hs = (item.history || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    for (var i = 0; i < hs.length; i++) {
      for (var j = 0; j < v.length; j++) if (v[j].id === hs[i].variantId) return v[j].name;
    }
    return v[0].name;
  }

  function notifyTargets(state, now) {
    now = now || new Date();
    var today = todayStr(now);
    var notified = state.notified || {};
    return state.items.filter(function (it) {
      if (!it.must || !it.history || !it.history.length) return false;
      if (isStale(it, today)) return false;
      var before = typeof it.notifyBefore === 'number' ? it.notifyBefore : 1;
      return dueInfo(it, today).left <= before && notified[it.id] !== today;
    });
  }

  g.RepiDB = {
    load: function () { return getKV('state'); },
    save: function (s) { return setKV('state', s); },
    getKV: getKV, setKV: setKV
  };
  g.RepiCore = {
    todayStr: todayStr, addDays: addDays, diffDays: diffDays, lastPurchase: lastPurchase,
    dueInfo: dueInfo, isStale: isStale, isQuiet: isQuiet, notifyTargets: notifyTargets,
    displayName: displayName, STALE_MIN_DAYS: STALE_MIN_DAYS
  };
})(self);
