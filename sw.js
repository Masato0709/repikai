/* リピ買い：サービスワーカー（オフライン表示・共有の受け取り・買いどき通知） */
importScripts('db.js');

var VERSION = '1.1.0';
var CACHE = 'ripikai-' + VERSION;
var ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'db.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* ほかのアプリやChromeの「共有」から届いたものを受け取り、アプリに渡す */
async function receiveShare(req) {
  try {
    var fd = await req.formData();
    var file = fd.get('image');
    await RepiDB.setKV('inbox', {
      title: String(fd.get('title') || ''),
      text: String(fd.get('text') || ''),
      url: String(fd.get('url') || ''),
      image: (file && typeof file === 'object' && file.size > 0) ? file : null,
      at: Date.now()
    });
  } catch (err) { /* 受け取れなかったときはそのままアプリを開く */ }
  return Response.redirect(new URL('./#share', self.registration.scope).href, 303);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (req.method === 'POST' && /\/share\/?$/.test(u.pathname)) { e.respondWith(receiveShare(req)); return; }
  if (req.method !== 'GET') return;
  if (u.pathname.endsWith('/version.json')) return; /* 版の確認は常にネットへ */
  /* 同じサイトのファイルは「まずネット、だめなら保存分」で返す */
  e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
  }));
});

async function checkAndNotify() {
  var state = await RepiDB.load();
  if (!state || !state.settings || !state.settings.notifyEnabled || !Array.isArray(state.items)) return;
  var now = new Date();
  if (RepiCore.isQuiet(state.settings, now)) return; /* 夜間は送らず、次の確認に回す */
  var targets = RepiCore.notifyTargets(state, now);
  if (!targets.length) return;
  var names = targets.map(function (t) { return RepiCore.displayName(t); });
  var body = names.slice(0, 3).join('、') + (names.length > 3 ? ' ほか' + (names.length - 3) + '点' : '') + ' がそろそろ買いどきです';
  await self.registration.showNotification('リピ買い', {
    body: body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    tag: 'ripikai-due', renotify: true, data: { url: './' }
  });
  /* 保存直前に読み直して、通知済みの印だけ付ける */
  var latest = (await RepiDB.load()) || state;
  var today = RepiCore.todayStr(now);
  latest.notified = latest.notified || {};
  targets.forEach(function (t) { latest.notified[t.id] = today; });
  await RepiDB.save(latest);
}

self.addEventListener('periodicsync', function (e) {
  if (e.tag === 'ripikai-check') e.waitUntil(checkAndNotify());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow('./');
  }));
});
