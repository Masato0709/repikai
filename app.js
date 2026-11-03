/* リピ買い：画面と操作 */
(function () {
  'use strict';
  var C = self.RepiCore, DB = self.RepiDB;
  var SITES = { amazon: 'Amazon', yodobashi: 'ヨドバシ.com', rakuten: '楽天', other: 'その他' };
  var SITE_KEYS = Object.keys(SITES);
  var DEFAULT_CATS = ['飲料', '食品', '洗剤・掃除', '紙類', '衛生用品', 'その他'];
  var WD = '日月火水木金土';
  var app = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');
  var toastEl = document.getElementById('toast');

  var APP_VERSION = '1.0.0';
  var lastVerCheck = 0;
  var state = null;
  var memoryOnly = false;
  var deferredInstall = null;
  var syncStatus = 'unknown';
  var ui = { site: 'all', cat: null, q: '', drawer: false };
  var form = { photo: undefined };
  var buyWatch = null;

  /* ---------- アイコン ---------- */
  function svg(d, w) {
    return '<svg width="' + (w || 22) + '" height="' + (w || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICON = {
    menu: svg('<path d="M3 7h18M3 12h18M3 17h18"/>'),
    bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', 16),
    back: svg('<path d="M15 5l-7 7 7 7"/>', 18),
    ext: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', 18),
    pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>', 18),
    star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', 16),
    home: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', 20),
    list: svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', 20),
    hist: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>', 20),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>', 20),
    cart: svg('<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>', 40)
  };

  /* 商品イラスト（写真がないとき） */
  var IL = {
    water: '<svg viewBox="0 0 150 170" aria-hidden="true"><g class="il-b"><rect x="22" y="40" width="48" height="122" rx="12"/><rect x="80" y="40" width="48" height="122" rx="12"/></g><g class="il-a"><rect x="39" y="22" width="14" height="18" rx="2"/><rect x="97" y="22" width="14" height="18" rx="2"/></g><g class="il-l"><rect x="22" y="84" width="48" height="30"/><rect x="80" y="84" width="48" height="30"/></g></svg>',
    roll: '<svg viewBox="0 0 150 150" aria-hidden="true"><g class="il-b"><path d="M15 45V125A30 10 0 0 0 75 125V45"/><ellipse cx="45" cy="45" rx="30" ry="10"/><path d="M75 45V125A30 10 0 0 0 135 125V45"/><ellipse cx="105" cy="45" rx="30" ry="10"/></g><g class="il-a"><ellipse cx="45" cy="45" rx="9" ry="3"/><ellipse cx="105" cy="45" rx="9" ry="3"/></g></svg>',
    pouch: '<svg viewBox="0 0 120 170" aria-hidden="true"><path class="il-b" d="M25 30H95L100 155Q60 166 20 155Z"/><rect class="il-a" x="72" y="14" width="16" height="18" rx="3"/><rect class="il-l" x="30" y="80" width="60" height="36"/></svg>',
    bottle: '<svg viewBox="0 0 150 170" aria-hidden="true"><g class="il-b"><path d="M40 52Q40 38 48 32V22H62V32Q70 38 70 52V158Q70 164 64 164H46Q40 164 40 158Z"/><path d="M80 52Q80 38 88 32V22H102V32Q110 38 110 52V158Q110 164 104 164H86Q80 164 80 158Z"/></g><g class="il-a"><rect x="47" y="14" width="16" height="8" rx="2"/><rect x="87" y="14" width="16" height="8" rx="2"/></g><g class="il-l"><rect x="40" y="90" width="30" height="28"/><rect x="80" y="90" width="30" height="28"/></g></svg>',
    box: '<svg viewBox="0 0 150 150" aria-hidden="true"><path class="il-b" d="M25 50L75 28L125 50V112L75 134L25 112Z"/><path class="il-b il-open" d="M25 50L75 72L125 50M75 72V134"/><path class="il-a" d="M50 39L100 61L112 56L62 34Z"/></svg>'
  };

  /* ---------- 小さな道具 ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function yen(n) { return (n == null || n === '') ? '—' : '¥' + Number(n).toLocaleString('ja-JP'); }
  function parts(s) { return s.split('-').map(Number); }
  function fmtMD(s) { if (!s) return '—'; var p = parts(s); return p[1] + '/' + p[2]; }
  function fmtMDW(s) { var p = parts(s); return p[1] + '/' + p[2] + '（' + WD[new Date(p[0], p[1] - 1, p[2]).getDay()] + '）'; }
  function fmtLong(s) { var p = parts(s); return p[1] + '月' + p[2] + '日（' + WD[new Date(p[0], p[1] - 1, p[2]).getDay()] + '）'; }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function clampInt(v, lo, hi, d) { var n = parseInt(v, 10); if (isNaN(n)) return d; return Math.min(hi, Math.max(lo, n)); }
  function numOrNull(v) { if (v === '' || v == null) return null; var n = Number(v); return isNaN(n) ? null : Math.max(0, Math.round(n)); }
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; }
  }
  function detectSite(url) {
    try {
      var h = new URL(url).hostname;
      if (/amazon\.|amzn\./.test(h)) return 'amazon';
      if (/yodobashi/.test(h)) return 'yodobashi';
      if (/rakuten/.test(h)) return 'rakuten';
    } catch (e) { /* 入力途中 */ }
    return null;
  }
  function siteLabel(it) { return SITES[it.site] || 'その他'; }
  function buyLabel(it) { return it.site === 'other' ? 'サイトで購入する' : siteLabel(it) + 'で購入する'; }

  var toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ---------- データ ---------- */
  function defaultState() {
    return { version: 1, items: [], categories: DEFAULT_CATS.slice(), settings: { quietStart: 22, quietEnd: 9, notifyEnabled: false }, pending: null, notified: {} };
  }
  function okId(v) { return typeof v === 'string' && /^[a-z0-9]{4,40}$/i.test(v); }
  function normalize(s) {
    if (!s || !Array.isArray(s.items)) throw new Error('bad data');
    var cats = Array.isArray(s.categories) ? s.categories.filter(function (c) { return typeof c === 'string' && c.trim(); }).map(function (c) { return c.trim().slice(0, 20); }) : [];
    if (!cats.length) cats = DEFAULT_CATS.slice();
    var items = s.items.map(function (it) {
      return {
        id: okId(it.id) ? it.id : uid(),
        name: String(it.name || '名前なし').slice(0, 60),
        url: safeUrl(it.url || '') || '',
        site: SITE_KEYS.indexOf(it.site) >= 0 ? it.site : 'other',
        category: typeof it.category === 'string' ? it.category.slice(0, 20) : cats[0],
        must: it.must !== false,
        cycle: clampInt(it.cycle, 1, 365, 7),
        notifyBefore: clampInt(it.notifyBefore, 0, 30, 1),
        price: numOrNull(it.price),
        image: typeof it.image === 'string' && it.image.indexOf('data:image/') === 0 ? it.image : null,
        snoozeUntil: isDate(it.snoozeUntil) ? it.snoozeUntil : null,
        createdAt: String(it.createdAt || new Date().toISOString()),
        history: Array.isArray(it.history) ? it.history.filter(function (h) { return h && isDate(h.date); }).map(function (h) {
          return { id: okId(h.id) ? h.id : uid(), date: h.date, t: String(h.t || ''), price: numOrNull(h.price), source: h.source === 'app' ? 'app' : 'manual' };
        }) : []
      };
    });
    var st = s.settings || {};
    return {
      version: 1, items: items, categories: cats,
      settings: { quietStart: clampInt(st.quietStart, 0, 23, 22), quietEnd: clampInt(st.quietEnd, 0, 23, 9), notifyEnabled: !!st.notifyEnabled },
      pending: null, notified: {}
    };
  }
  function normalizeLoaded(s) {
    var n = normalize(s);
    if (s.pending && okId(s.pending.itemId) && okId(s.pending.histId)) n.pending = { itemId: s.pending.itemId, histId: s.pending.histId, at: Number(s.pending.at) || 0 };
    if (s.notified && typeof s.notified === 'object') {
      Object.keys(s.notified).forEach(function (k) { if (okId(k) && isDate(s.notified[k])) n.notified[k] = s.notified[k]; });
    }
    return n;
  }
  async function persist() {
    if (memoryOnly) return;
    var ok = await DB.save(state);
    if (!ok) { memoryOnly = true; toast('この環境では保存できません（お試し表示のみ）'); }
  }

  function getItem(id) { return state.items.find(function (i) { return i.id === id; }); }
  function sortedHistory(it) {
    return it.history.slice().sort(function (a, b) {
      return a.date === b.date ? String(b.t).localeCompare(String(a.t)) : b.date.localeCompare(a.date);
    });
  }
  function priced(it) { return sortedHistory(it).filter(function (h) { return h.price != null; }); }
  function lastPrice(it) { var p = priced(it); return p.length ? p[0].price : it.price; }
  function prevPrice(it) { var p = priced(it); return p.length > 1 ? p[1].price : null; }
  function avgInterval(it) {
    var ds = Array.from(new Set(it.history.map(function (h) { return h.date; }))).sort().slice(-11);
    if (ds.length < 3) return null;
    var sum = 0;
    for (var i = 1; i < ds.length; i++) sum += C.diffDays(ds[i], ds[i - 1]);
    return Math.round(sum / (ds.length - 1) * 10) / 10;
  }
  function status(it) {
    var d = C.dueInfo(it, C.todayStr());
    var never = !it.history.length;
    var level, label;
    if (!it.must) { level = 'occ'; label = d.last ? '前回 ' + fmtMD(d.last) : '未購入'; }
    else if (never) { level = 'hot'; label = '未購入'; }
    else if (d.left < 0) { level = 'over'; label = (-d.left) + '日過ぎ'; }
    else if (d.left === 0) { level = 'hot'; label = '今日'; }
    else if (d.left <= 3) { level = 'warm'; label = 'あと' + d.left + '日'; }
    else { level = 'calm'; label = 'あと' + d.left + '日'; }
    return { last: d.last, due: d.due, left: d.left, level: level, label: label, never: never };
  }
  function kindOf(cat) {
    if (cat === '飲料') return 'water';
    if (cat === '紙類') return 'roll';
    if (cat === '洗剤・掃除') return 'pouch';
    if (cat === '衛生用品') return 'bottle';
    return 'box';
  }
  function tintOf(it) {
    var h = 0;
    for (var i = 0; i < it.id.length; i++) h = (h * 31 + it.id.charCodeAt(i)) >>> 0;
    return 'var(--tint' + (h % 3 + 1) + ')';
  }
  function thumb(it) { return it.image ? '<img src="' + esc(it.image) + '" alt="">' : IL[kindOf(it.category)]; }

  /* ---------- 画面の枠 ---------- */
  function route() {
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('item-') === 0) return { name: 'item', id: h.slice(5) };
    if (h === 'history') return { name: 'history' };
    if (h === 'prefs') return { name: 'settings' };
    if (h === 'all-items') return { name: 'items' };
    return { name: 'home' };
  }
  /* 購入ボタンは本物のリンクにする（Androidでは各社のアプリでも開ける） */
  function buyAttrs(it) {
    var u = safeUrl(it.url || '');
    return u ? 'href="' + esc(u) + '" target="_blank" rel="noopener"' : 'href="#" data-nolink="1"';
  }
  function counts() {
    var today = 0, soon = 0;
    state.items.forEach(function (it) {
      if (!it.must) return;
      var s = status(it);
      if (s.level === 'hot' || s.level === 'over') today++;
      else if (s.level === 'warm') soon++;
    });
    return { today: today, soon: soon };
  }
  function chrome() {
    var c = counts(), st = state.settings;
    var dark = st.notifyEnabled
      ? esc(st.quietStart + ':00〜' + st.quietEnd + ':00 は通知をお休みします')
      : '通知はオフです ・ <a href="#prefs">設定でオンにする</a>';
    var upd = ui.updateReady
      ? '<div class="update-bar"><span>新しいバージョン（ver ' + esc(ui.updateReady) + '）があります' + (ui.updateNote ? '：' + esc(ui.updateNote) : '') + '</span><button data-action="doUpdate">更新する</button></div>'
      : '';
    return upd + '<div class="band"><span>本日の買いどき ' + c.today + '点</span><span class="pill">REPEAT ORDER</span><span>3日以内 ' + c.soon + '点</span></div>' +
      '<div class="darkbar">' + dark + '</div>' +
      '<header class="hdr"><button class="icon-btn" data-action="drawer" aria-label="メニュー">' + ICON.menu + '</button>' +
      '<a class="logo" href="#home"><b>リピ買い<i>.</i></b><small>DAILY GOODS STORE</small></a>' +
      '<div class="hdr-right"><a class="icon-btn" href="#prefs" aria-label="通知と設定">' + ICON.bell + '</a>' +
      '<button class="icon-btn accent" data-action="add" aria-label="商品を追加">' + ICON.plus + '</button></div></header>';
  }
  function drawerHtml() {
    if (!ui.drawer) return '';
    return '<div class="drawer-wrap"><div class="drawer-backdrop"></div><nav class="drawer" aria-label="メニュー">' +
      '<div class="drawer-logo">リピ買い<i>.</i></div>' +
      '<a href="#home" data-action="closeDrawer">' + ICON.home + 'そろそろ買う</a>' +
      '<a href="#all-items" data-action="closeDrawer">' + ICON.list + 'すべての商品</a>' +
      '<a href="#history" data-action="closeDrawer">' + ICON.hist + '購入履歴</a>' +
      '<a href="#prefs" data-action="closeDrawer">' + ICON.gear + '設定</a>' +
      '<button data-action="add">' + ICON.plus + '商品を追加</button></nav></div>';
  }
  function render() {
    var r = route(), main;
    if (r.name === 'item') main = viewItem(r.id);
    else if (r.name === 'history') main = viewHistory();
    else if (r.name === 'settings') main = viewSettings();
    else if (r.name === 'items') main = viewItems();
    else main = viewHome();
    app.innerHTML = chrome() + '<main>' + main + '</main>' + drawerHtml();
  }

  /* ---------- ホーム ---------- */
  function filtered() {
    var q = ui.q.trim().toLowerCase();
    return state.items.filter(function (it) {
      return (ui.site === 'all' || it.site === ui.site) && (!ui.cat || it.category === ui.cat) && (!q || it.name.toLowerCase().indexOf(q) >= 0);
    });
  }
  function installHint() {
    if (!deferredInstall) return '';
    return '<div class="hint"><span>ホーム画面に追加すると、アプリのように使えて通知も届きやすくなります</span><button class="btn-sub" data-action="install">追加する</button></div>';
  }
  function viewHome() {
    var tabs = ['all', 'amazon', 'yodobashi', 'rakuten'].map(function (k) {
      return '<button data-action="site" data-site="' + k + '" class="' + (ui.site === k ? 'on' : '') + '">' + (k === 'all' ? 'すべて' : SITES[k]) + '</button>';
    }).join('');
    return '<div class="search"><label>' + ICON.search + '<input id="q" type="search" placeholder="登録した商品から探す" value="' + esc(ui.q) + '" aria-label="商品を検索"></label></div>' +
      '<nav class="nav" aria-label="絞り込み">' + tabs +
      '<button data-action="catPick" class="' + (ui.cat ? 'on' : '') + '">' + (ui.cat ? 'カテゴリー：' + esc(ui.cat) : 'カテゴリー') + '</button>' +
      '<a href="#history">購入履歴</a></nav>' +
      '<div class="wrap"><div class="ttl"><h1>そろそろ買う</h1><small>REPEAT ITEMS</small></div>' + installHint() +
      '<div id="home-body">' + homeBody() + '</div></div>';
  }
  function homeBody() {
    if (!state.items.length) return emptyState();
    var list = filtered();
    if (!list.length) return '<p class="empty-col center">条件に合う商品がありません</p>';
    var all = list.map(function (it) { return { it: it, s: status(it) }; });
    var must = all.filter(function (x) { return x.it.must; }).sort(function (a, b) { return a.s.left - b.s.left; });
    var today = must.filter(function (x) { return x.s.level === 'hot' || x.s.level === 'over'; });
    var soon = must.filter(function (x) { return x.s.level === 'warm'; });
    var later = must.filter(function (x) { return x.s.level === 'calm'; });
    var occ = all.filter(function (x) { return !x.it.must; });
    function col(title, cls, arr) {
      return '<section class="col"><div class="col-h"><span class="dot ' + cls + '"></span>' + title + '<span class="cnt">' + arr.length + '</span></div>' +
        (arr.length ? arr.map(function (x, i) { return rowHtml(x, i + 1); }).join('') : '<p class="empty-col">ありません</p>') + '</section>';
    }
    var html = '<div class="cols">' + col('今日・期限切れ', 'hot', today) + col('3日以内', 'warm', soon) + col('それ以降', 'calm', later) + '</div>';
    if (occ.length) {
      html += '<section class="occ"><div class="col-h"><span class="dot calm"></span>たまに買う<span class="note-inline">通知なし</span><span class="cnt">' + occ.length + '</span></div>' +
        '<div class="occ-grid">' + occ.map(occHtml).join('') + '</div></section>';
    }
    return html;
  }
  function rowHtml(x, n) {
    var it = x.it, s = x.s, id = esc(it.id);
    var snooze = (s.level !== 'calm' && !s.never) ? '<button class="link-btn" data-action="snooze" data-id="' + id + '">まだある</button>' : '';
    return '<div class="row"><a class="thumb" href="#item-' + id + '" style="background:' + tintOf(it) + '" aria-label="' + esc(it.name) + 'の詳細">' + thumb(it) + '</a>' +
      '<div class="row-body"><div class="row-top"><span class="no">' + n + '</span><span class="site">' + siteLabel(it) + '</span>' + snooze + '</div>' +
      '<a class="row-name" href="#item-' + id + '">' + esc(it.name) + '</a>' +
      '<div class="row-meta"><span>' + yen(lastPrice(it)) + '</span><span class="tag ' + s.level + '">' + s.label + '</span>' +
      '<a class="btn-buy ' + s.level + '" ' + buyAttrs(it) + ' data-action="buy" data-id="' + id + '">購入する</a></div></div></div>';
  }
  function occHtml(x) {
    var it = x.it, id = esc(it.id);
    return '<div class="occ-card"><a class="thumb" href="#item-' + id + '" style="background:' + tintOf(it) + '" aria-label="' + esc(it.name) + 'の詳細">' + thumb(it) + '</a>' +
      '<div class="occ-body"><a class="row-name" href="#item-' + id + '">' + esc(it.name) + '</a><span class="occ-meta">' + siteLabel(it) + ' ・ ' + x.s.label + '</span></div>' +
      '<a class="btn-buy occ" ' + buyAttrs(it) + ' data-action="buy" data-id="' + id + '">購入する</a></div>';
  }
  function emptyState() {
    return '<div class="empty"><div class="thumb xl" style="background:var(--tint1)">' + IL.water + '</div>' +
      '<h2>まだ商品が登録されていません</h2>' +
      '<p>よく買う日用品と、その商品ページのリンクを登録しましょう。<br>買う周期に合わせて、買いどきをお知らせします。</p>' +
      '<div class="empty-actions"><button class="btn-primary" data-action="add">最初の商品を登録する</button>' +
      '<button class="btn-ghost" data-action="sample">サンプルで試してみる</button></div></div>';
  }

  /* ---------- 商品詳細 ---------- */
  function viewItem(id) {
    var it = getItem(id);
    if (!it) return '<div class="wrap"><p>商品が見つかりません。</p><a href="#home">ホームへ戻る</a></div>';
    var s = status(it), eid = esc(it.id);
    var lp = lastPrice(it), pp = prevPrice(it);
    var diff = (lp != null && pp != null && lp !== pp) ? ' <span class="muted">（前々回 ' + yen(pp) + ' から ' + (lp > pp ? '+' : '−') + '¥' + Math.abs(lp - pp).toLocaleString('ja-JP') + '）</span>' : '';
    var avg = avgInterval(it), suggest;
    if (avg && Math.round(avg) !== it.cycle) {
      suggest = '<div class="suggest"><span>実際は平均 <b>' + avg + '日</b> ごとに買っています</span><button class="btn-sub" data-action="applyAvg" data-id="' + eid + '">' + Math.round(avg) + '日ごとにする</button></div>';
    } else if (avg) {
      suggest = '<div class="suggest calm">実際の平均は ' + avg + '日 で、設定どおりです</div>';
    } else {
      suggest = '<div class="suggest calm">3回以上買うと、実際の周期を自動で計算します</div>';
    }
    var hs = sortedHistory(it);
    var rows = hs.map(function (h, i) {
      var nx = hs[i + 1];
      var gap = nx ? '前回から' + C.diffDays(h.date, nx.date) + '日' : 'はじめての記録';
      return '<div class="hrow"><div class="hdate"><b>' + fmtMDW(h.date) + '</b><small>' + gap + '</small></div>' +
        '<span class="hprice">' + yen(h.price) + '</span><span class="hsrc">' + (h.source === 'app' ? 'アプリから' : '手動') + '</span>' +
        '<button class="icon-btn sm" data-action="editHist" data-id="' + eid + '" data-hid="' + esc(h.id) + '" aria-label="この履歴を編集">' + ICON.pencil + '</button></div>';
    }).join('');
    var nb = it.notifyBefore === 0 ? '当日' : it.notifyBefore + '日前';
    return '<div class="wrap"><a class="back" href="#home">' + ICON.back + 'そろそろ買う</a><div class="detail"><div class="dcol">' +
      '<section class="card"><div class="d-head"><div class="thumb lg" style="background:' + tintOf(it) + '">' + thumb(it) + '</div>' +
      '<div class="d-title"><h1>' + esc(it.name) + '</h1><span class="tag ' + s.level + '">' + s.label + '</span></div></div>' +
      '<div class="seg2" role="group" aria-label="種類">' +
      '<button data-action="setMust" data-id="' + eid + '" data-v="1" class="' + (it.must ? 'on' : '') + '" aria-pressed="' + it.must + '">' + ICON.star + '必ず買う（通知あり）</button>' +
      '<button data-action="setMust" data-id="' + eid + '" data-v="0" class="' + (!it.must ? 'on' : '') + '" aria-pressed="' + !it.must + '">たまに買う（通知なし）</button></div>' +
      '<dl class="info"><dt>サイト</dt><dd>' + siteLabel(it) + '</dd>' +
      '<dt>リンク</dt><dd class="trunc">' + (it.url ? esc(it.url) : '<span class="muted">未登録</span>') + '</dd>' +
      '<dt>カテゴリー</dt><dd>' + esc(it.category) + '</dd>' +
      '<dt>前回価格</dt><dd><b>' + yen(lp) + '</b>' + diff + '</dd>' +
      '<dt>前回購入</dt><dd>' + (s.last ? fmtLong(s.last) : '—') + '</dd>' +
      (it.must && !s.never ? '<dt>次の買いどき</dt><dd><b>' + fmtLong(s.due) + '</b></dd>' : '') + '</dl>' +
      '<button class="btn-ghost" data-action="edit" data-id="' + eid + '">' + ICON.pencil + '編集する</button></section>' +
      (it.must ? '<section class="card"><h2>周期と通知</h2><div class="steps">' +
        '<div class="step"><span>買う周期</span><div class="stepper"><button data-action="cycle" data-d="-1" data-id="' + eid + '" aria-label="1日減らす">−</button><b>' + it.cycle + '日ごと</b><button data-action="cycle" data-d="1" data-id="' + eid + '" aria-label="1日増やす">＋</button></div></div>' +
        '<div class="step"><span>通知のタイミング</span><div class="stepper"><button data-action="notify" data-d="-1" data-id="' + eid + '" aria-label="1日減らす">−</button><b>' + nb + '</b><button data-action="notify" data-d="1" data-id="' + eid + '" aria-label="1日増やす">＋</button></div></div>' +
        '</div>' + suggest + '</section>' : '') +
      '<div class="d-actions"><a class="btn-primary big" ' + buyAttrs(it) + ' data-action="buy" data-id="' + eid + '">' + buyLabel(it) + ICON.ext + '</a>' +
      (it.must && !s.never ? '<button class="btn-ghost big" data-action="snooze" data-id="' + eid + '">まだある</button>' : '') + '</div></div>' +
      '<section class="card hist"><div class="hist-h"><h2>購入履歴</h2><span class="count-pill">全' + hs.length + '回</span>' +
      '<button class="btn-ghost sm" data-action="addHist" data-id="' + eid + '">' + ICON.plus + '手動で追加</button></div>' +
      (hs.length ? rows : '<p class="muted pad">まだ記録がありません</p>') + '</section></div></div>';
  }

  /* ---------- すべての商品 ---------- */
  function viewItems() {
    var groups = state.categories.map(function (c) {
      return { c: c, items: state.items.filter(function (i) { return i.category === c; }) };
    }).filter(function (g) { return g.items.length; });
    var orphan = state.items.filter(function (i) { return state.categories.indexOf(i.category) < 0; });
    if (orphan.length) groups.push({ c: '未分類', items: orphan });
    var body = groups.length ? groups.map(function (g) {
      return '<section class="group"><div class="col-h">' + esc(g.c) + '<span class="cnt">' + g.items.length + '</span></div><div class="glist">' +
        g.items.map(function (it) {
          var s = status(it);
          return '<a class="grow" href="#item-' + esc(it.id) + '"><span class="thumb sm" style="background:' + tintOf(it) + '">' + thumb(it) + '</span>' +
            '<span class="g-name">' + esc(it.name) + '<small>' + siteLabel(it) + ' ・ ' + (it.must ? it.cycle + '日ごと' : 'たまに買う') + '</small></span>' +
            '<span class="tag ' + s.level + '">' + s.label + '</span></a>';
        }).join('') + '</div></section>';
    }).join('') : emptyState();
    return '<div class="wrap narrow"><div class="ttl"><h1>すべての商品</h1><small>ALL ITEMS</small></div>' +
      '<div class="list-actions"><button class="btn-primary" data-action="add">' + ICON.plus + '商品を追加</button></div>' + body + '</div>';
  }

  /* ---------- 購入履歴 ---------- */
  function viewHistory() {
    var all = [];
    state.items.forEach(function (it) { it.history.forEach(function (h) { all.push({ it: it, h: h }); }); });
    all.sort(function (a, b) { return b.h.date.localeCompare(a.h.date) || String(b.h.t).localeCompare(String(a.h.t)); });
    var months = [], map = {};
    all.forEach(function (x) {
      var k = x.h.date.slice(0, 7);
      if (!map[k]) { map[k] = []; months.push(k); }
      map[k].push(x);
    });
    var html = '<div class="wrap narrow"><div class="ttl"><h1>購入履歴</h1><small>HISTORY</small></div>';
    if (!all.length) html += '<p class="empty-col center">まだ購入の記録がありません</p>';
    months.forEach(function (k) {
      var arr = map[k], p = k.split('-');
      var sum = arr.reduce(function (t, x) { return t + (Number(x.h.price) || 0); }, 0);
      html += '<section class="month"><div class="col-h">' + p[0] + '年' + Number(p[1]) + '月<span class="cnt">' + arr.length + '回 ・ ' + yen(sum) + '</span></div>' +
        arr.map(function (x) {
          return '<div class="hrow"><div class="hdate"><b>' + fmtMDW(x.h.date) + '</b></div>' +
            '<a class="h-item" href="#item-' + esc(x.it.id) + '">' + esc(x.it.name) + '<small>' + siteLabel(x.it) + '</small></a>' +
            '<span class="hprice">' + yen(x.h.price) + '</span><span class="hsrc">' + (x.h.source === 'app' ? 'アプリから' : '手動') + '</span>' +
            '<button class="icon-btn sm" data-action="editHist" data-id="' + esc(x.it.id) + '" data-hid="' + esc(x.h.id) + '" aria-label="この履歴を編集">' + ICON.pencil + '</button></div>';
        }).join('') + '</section>';
    });
    return html + '</div>';
  }

  /* ---------- 設定 ---------- */
  function viewSettings() {
    var st = state.settings;
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    var on = st.notifyEnabled && perm === 'granted';
    var permText = on ? 'オン' : perm === 'denied' ? 'ブロックされています（端末の設定でChromeの通知を許可してください）' : perm === 'unsupported' ? 'この端末では使えません' : 'オフ';
    var syncText = {
      ok: '有効（Chromeが1日に数回、買いどきを確認します）',
      denied: 'ホーム画面に追加すると有効になります',
      unsupported: 'この端末では使えません（アプリを開いたときに画面で確認できます）',
      error: '設定できませんでした',
      unknown: '—'
    }[syncStatus];
    function hours(sel) {
      var o = '';
      for (var h = 0; h < 24; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + h + ':00</option>';
      return o;
    }
    var cats = state.categories.map(function (c) {
      var n = state.items.filter(function (i) { return i.category === c; }).length;
      return '<div class="cat-row"><span class="cat-name">' + esc(c) + '</span><span class="muted">' + n + '件</span>' +
        '<button class="link-btn" data-action="renameCat" data-cat="' + esc(c) + '">名前を変更</button>' +
        '<button class="link-btn danger" data-action="delCat" data-cat="' + esc(c) + '">削除</button></div>';
    }).join('');
    return '<div class="wrap narrow"><div class="ttl"><h1>設定</h1><small>SETTINGS</small></div>' +
      '<section class="card set"><h2>通知</h2><dl class="info"><dt>通知</dt><dd>' + permText + '</dd><dt>自動チェック</dt><dd>' + (on ? syncText : '—') + '</dd></dl>' +
      '<div class="set-actions">' + (on
        ? '<button class="btn-ghost" data-action="testNotify">テスト通知を送る</button><button class="btn-ghost" data-action="disableNotify">通知をオフにする</button>'
        : '<button class="btn-primary" data-action="enableNotify">通知をオンにする</button>') + '</div>' +
      '<p class="note">「必ず買う」商品だけが通知の対象です。通知の時刻はChromeが決めるため前後しますが、下の時間帯には届きません。</p></section>' +
      '<section class="card set"><h2>通知しない時間帯</h2><div class="quiet"><select id="qs" aria-label="開始時刻">' + hours(st.quietStart) + '</select><span>から</span>' +
      '<select id="qe" aria-label="終了時刻">' + hours(st.quietEnd) + '</select><span>まで</span></div></section>' +
      '<section class="card set"><h2>カテゴリー</h2><div class="cat-list">' + cats + '</div>' +
      '<form id="cat-form" class="cat-add"><input name="cat" maxlength="20" placeholder="新しいカテゴリー名" aria-label="新しいカテゴリー名"><button class="btn-ghost" type="submit">追加</button></form></section>' +
      '<section class="card set"><h2>バックアップ</h2><p class="note">データはこの端末の中だけに保存されています。機種変更やブラウザのデータ削除に備えて、ときどきファイルに書き出してください。iPhoneで見たいときも、このファイルを読み込めば同じ内容を表示できます。</p>' +
      '<div class="set-actions"><button class="btn-ghost" data-action="export">ファイルに書き出す</button>' +
      '<label class="btn-ghost as-btn">ファイルから読み込む<input type="file" id="import-file" accept="application/json,.json" hidden></label></div></section>' +
      (deferredInstall ? '<section class="card set"><h2>ホーム画面に追加</h2><p class="note">アプリのように起動でき、通知も届きやすくなります。</p><button class="btn-primary" data-action="install">ホーム画面に追加する</button></section>' : '') +
      '<p class="ver">リピ買い ver ' + APP_VERSION + '</p></div>';
  }

  /* ---------- モーダル ---------- */
  var pendingConfirm = null;
  function openModal(html) { modalRoot.innerHTML = '<div class="modal-backdrop">' + html + '</div>'; }
  function askConfirm(msg, okLabel, onOk) {
    pendingConfirm = onOk;
    openModal('<div class="dialog confirm" role="alertdialog" aria-label="確認"><p class="confirm-msg">' + esc(msg) + '</p>' +
      '<div class="sheet-actions"><span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">やめる</button>' +
      '<button type="button" class="btn-primary" data-action="confirmOk">' + esc(okLabel) + '</button></div></div>');
  }
  function closeModal() { modalRoot.innerHTML = ''; }

  function openCatPick() {
    var opts = ['__all'].concat(state.categories).map(function (c) {
      var on = (c === '__all' && !ui.cat) || c === ui.cat;
      return '<button class="pick-btn ' + (on ? 'on' : '') + '" data-action="setCat" data-cat="' + esc(c) + '">' + (c === '__all' ? 'すべて' : esc(c)) + '</button>';
    }).join('');
    openModal('<div class="dialog"><h2>カテゴリーで絞り込む</h2><div class="pick">' + opts + '</div></div>');
  }

  function openItemForm(id) {
    var it = id ? getItem(id) : null;
    form = { photo: undefined };
    var v = it || { name: '', url: '', site: 'amazon', category: state.categories[0], must: true, cycle: 7, notifyBefore: 1, image: null };
    var lp = it ? lastPrice(it) : null;
    var sites = SITE_KEYS.map(function (k) {
      return '<label><input type="radio" name="site" value="' + k + '"' + (v.site === k ? ' checked' : '') + '><span>' + SITES[k] + '</span></label>';
    }).join('');
    var cats = state.categories.map(function (c) {
      return '<option' + (c === v.category ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    openModal('<form class="dialog sheet" id="item-form" data-id="' + (it ? esc(it.id) : '') + '" novalidate>' +
      '<h2>' + (it ? '商品を編集' : '商品を登録') + '</h2>' +
      '<label class="field"><span>商品名</span><input name="name" maxlength="60" value="' + esc(v.name) + '" placeholder="例：ミネラルウォーター 2L×6本"></label>' +
      '<label class="field"><span>商品ページのリンク</span><input name="url" type="url" inputmode="url" value="' + esc(v.url) + '" placeholder="https://"><small>商品ページのURLを貼り付けると、サイトを自動で選びます</small></label>' +
      '<div class="field"><span>サイト</span><div class="seg">' + sites + '</div></div>' +
      '<label class="field"><span>カテゴリー</span><select name="category">' + cats + '</select></label>' +
      '<div class="field"><span>種類</span><div class="seg"><label><input type="radio" name="must" value="1"' + (v.must ? ' checked' : '') + '><span>必ず買う（通知あり）</span></label>' +
      '<label><input type="radio" name="must" value="0"' + (!v.must ? ' checked' : '') + '><span>たまに買う（通知なし）</span></label></div></div>' +
      '<div class="field-row"><label class="field"><span>買う周期（日ごと）</span><input name="cycle" type="number" min="1" max="365" inputmode="numeric" value="' + v.cycle + '"></label>' +
      '<label class="field"><span>何日前に通知</span><input name="notifyBefore" type="number" min="0" max="30" inputmode="numeric" value="' + v.notifyBefore + '"></label></div>' +
      '<div class="field-row"><label class="field"><span>' + (it ? '前回価格（円）' : '価格（円・任意）') + '</span><input name="price" type="number" min="0" inputmode="numeric" value="' + (lp == null ? '' : lp) + '"></label>' +
      (it ? '' : '<label class="field"><span>前回買った日（任意）</span><input name="lastDate" type="date" max="' + C.todayStr() + '"></label>') + '</div>' +
      '<div class="field"><span>写真（任意）</span><div class="photo-row"><div class="thumb" id="photo-prev" style="background:var(--tint1)">' + (v.image ? '<img src="' + esc(v.image) + '" alt="">' : IL[kindOf(v.category)]) + '</div>' +
      '<label class="btn-ghost as-btn">写真を選ぶ<input type="file" id="photo-file" accept="image/*" hidden></label>' +
      (v.image ? '<button type="button" class="link-btn" data-action="clearPhoto">写真を外す</button>' : '') + '</div></div>' +
      '<p class="form-err" id="form-err" role="alert"></p>' +
      '<div class="sheet-actions">' + (it ? '<button type="button" class="link-btn danger" data-action="deleteItem" data-id="' + esc(it.id) + '">この商品を削除</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">キャンセル</button><button type="submit" class="btn-primary">保存する</button></div></form>');
  }

  function saveItem(f) {
    var fd = new FormData(f);
    var err = f.querySelector('#form-err');
    var name = String(fd.get('name') || '').trim();
    var urlRaw = String(fd.get('url') || '').trim();
    if (!name) { err.textContent = '商品名を入力してください'; return; }
    var url = '';
    if (urlRaw) {
      url = safeUrl(urlRaw);
      if (!url) { err.textContent = 'リンクは https:// から始まるURLを入力してください'; return; }
    }
    var cycle = clampInt(fd.get('cycle'), 1, 365, 7);
    var nb = clampInt(fd.get('notifyBefore'), 0, 30, 1);
    var price = numOrNull(fd.get('price'));
    var id = f.dataset.id;
    var it = id ? getItem(id) : null;
    if (!it) {
      it = { id: uid(), history: [], createdAt: new Date().toISOString(), snoozeUntil: null, image: null, price: price };
      var ld = fd.get('lastDate');
      if (isDate(ld)) it.history.push({ id: uid(), date: ld, t: new Date().toISOString(), price: price, source: 'manual' });
      state.items.push(it);
    } else {
      var p = priced(it);
      if (p.length && price != null) p[0].price = price; else it.price = price;
    }
    it.name = name;
    it.url = url;
    it.site = SITE_KEYS.indexOf(fd.get('site')) >= 0 ? fd.get('site') : 'other';
    it.category = fd.get('category') || state.categories[0];
    it.must = fd.get('must') !== '0';
    it.cycle = cycle;
    it.notifyBefore = nb;
    if (form.photo !== undefined) it.image = form.photo;
    persist();
    closeModal();
    toast(id ? '保存しました' : '登録しました');
    if (!id) location.hash = '#item-' + it.id; else render();
  }

  function openHistForm(itemId, hid) {
    var it = getItem(itemId);
    if (!it) return;
    var h = hid ? it.history.find(function (x) { return x.id === hid; }) : null;
    var price = h ? h.price : lastPrice(it);
    openModal('<form class="dialog" id="hist-form" data-id="' + esc(it.id) + '" data-hid="' + (h ? esc(h.id) : '') + '">' +
      '<h2>' + (h ? '購入履歴を編集' : '購入を手動で追加') + '</h2><p class="muted">' + esc(it.name) + '</p>' +
      '<label class="field"><span>購入日</span><input type="date" name="date" required max="' + C.todayStr() + '" value="' + (h ? h.date : C.todayStr()) + '"></label>' +
      '<label class="field"><span>価格（円・任意）</span><input type="number" name="price" min="0" inputmode="numeric" value="' + (price == null ? '' : price) + '"></label>' +
      '<div class="sheet-actions">' + (h ? '<button type="button" class="link-btn danger" data-action="deleteHist" data-id="' + esc(it.id) + '" data-hid="' + esc(h.id) + '">この記録を削除</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">キャンセル</button><button type="submit" class="btn-primary">保存する</button></div></form>');
  }
  function saveHist(f) {
    var it = getItem(f.dataset.id);
    if (!it) return;
    var fd = new FormData(f);
    var date = fd.get('date');
    if (!isDate(date)) return;
    var price = numOrNull(fd.get('price'));
    var hid = f.dataset.hid;
    if (hid) {
      var h = it.history.find(function (x) { return x.id === hid; });
      if (h) { h.date = date; h.price = price; }
    } else {
      it.history.push({ id: uid(), date: date, t: new Date().toISOString(), price: price, source: 'manual' });
      it.snoozeUntil = null;
    }
    persist();
    closeModal();
    render();
    toast('購入履歴を保存しました');
  }

  /* ---------- 購入・確認 ---------- */
  function buy(id) {
    var it = getItem(id);
    if (!it) return;
    var h = { id: uid(), date: C.todayStr(), t: new Date().toISOString(), price: lastPrice(it), source: 'app' };
    it.history.push(h);
    it.snoozeUntil = null;
    state.pending = { itemId: it.id, histId: h.id, at: Date.now() };
    persist();
    render();
    var wentAway = false;
    function onHide() { if (document.visibilityState === 'hidden') wentAway = true; }
    document.addEventListener('visibilitychange', onHide);
    clearTimeout(buyWatch);
    buyWatch = setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      if (!wentAway && document.visibilityState === 'visible') showReturn();
    }, 2500);
  }
  function checkPending() {
    var p = state.pending;
    if (!p) return;
    if (Date.now() - p.at > 12 * 3600 * 1000) { state.pending = null; persist(); return; }
    showReturn();
  }
  function showReturn() {
    var p = state.pending;
    if (!p || modalRoot.querySelector('.ret')) return;
    var it = getItem(p.itemId);
    var h = it && it.history.find(function (x) { return x.id === p.histId; });
    if (!it || !h) { state.pending = null; persist(); return; }
    var from = it.site === 'other' ? 'お店' : siteLabel(it);
    openModal('<div class="dialog ret" role="dialog" aria-label="購入の確認"><div class="ret-icon">' + ICON.cart + '</div>' +
      '<span class="ret-from">' + esc(from) + 'から おかえりなさい</span>' +
      '<div class="ret-name">' + esc(it.name) + '</div><div class="ret-q">買えましたか？</div>' +
      '<div class="ret-price"><label for="ret-price">今回の価格</label><div class="yen"><span>¥</span><input id="ret-price" type="number" min="0" inputmode="numeric" value="' + (h.price == null ? '' : h.price) + '"></div><span class="muted">任意</span></div>' +
      (it.must ? '<div class="ret-next">' + ICON.bell + '<span>「はい」で次の買いどきは <b>' + fmtLong(C.addDays(h.date, it.cycle)) + '</b></span></div>' : '') +
      '<div class="ret-actions"><button class="btn-primary big" data-action="retYes">はい、買った</button><button class="btn-ghost big" data-action="retNo">いいえ、まだ</button></div>' +
      '<p class="ret-note">あとから購入履歴で直せます</p></div>');
  }
  function retAnswer(yes) {
    var p = state.pending;
    if (p) {
      var it = getItem(p.itemId);
      if (it) {
        if (yes) {
          var h = it.history.find(function (x) { return x.id === p.histId; });
          var el = document.getElementById('ret-price');
          if (h && el) h.price = numOrNull(el.value);
          delete state.notified[it.id];
        } else {
          it.history = it.history.filter(function (x) { return x.id !== p.histId; });
        }
      }
      state.pending = null;
      persist();
    }
    closeModal();
    render();
    toast(yes ? '購入を記録しました' : '記録を取り消しました');
  }
  function snooze(id) {
    var it = getItem(id);
    if (!it) return;
    var s = status(it), today = C.todayStr();
    var base = s.due > today ? s.due : today;
    it.snoozeUntil = C.addDays(base, 2);
    delete state.notified[it.id];
    persist();
    render();
    toast(fmtLong(it.snoozeUntil) + ' にまたお知らせします');
  }

  /* ---------- 通知 ---------- */
  async function registerSync() {
    try {
      if (!('serviceWorker' in navigator)) { syncStatus = 'unsupported'; return; }
      var reg = await navigator.serviceWorker.ready;
      if (!('periodicSync' in reg)) { syncStatus = 'unsupported'; return; }
      var st = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (st.state !== 'granted') { syncStatus = 'denied'; return; }
      await reg.periodicSync.register('ripikai-check', { minInterval: 6 * 3600 * 1000 });
      syncStatus = 'ok';
    } catch (e) { syncStatus = 'error'; }
  }
  async function enableNotify() {
    if (!('Notification' in window)) { toast('この端末では通知を使えません'); return; }
    var p = await Notification.requestPermission();
    if (p !== 'granted') { toast('通知が許可されませんでした'); render(); return; }
    state.settings.notifyEnabled = true;
    await persist();
    await registerSync();
    render();
    toast('通知をオンにしました');
  }
  async function disableNotify() {
    state.settings.notifyEnabled = false;
    await persist();
    try {
      var reg = await navigator.serviceWorker.ready;
      if (reg.periodicSync) await reg.periodicSync.unregister('ripikai-check');
    } catch (e) { /* 未対応 */ }
    render();
    toast('通知をオフにしました');
  }
  async function testNotify() {
    try {
      var reg = await navigator.serviceWorker.ready;
      await reg.showNotification('リピ買い', { body: 'テスト通知です。買いどきになるとこのように届きます。', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'ripikai-test' });
    } catch (e) { toast('通知を送れませんでした'); }
  }
  async function doInstall() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) { /* 無視 */ }
    deferredInstall = null;
    render();
  }

  /* ---------- バックアップ・カテゴリー ---------- */
  function exportData() {
    var blob = new Blob([JSON.stringify({ app: 'ripikai', exportedAt: new Date().toISOString(), state: state })], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ripikai-backup-' + C.todayStr().replace(/-/g, '') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('ファイルに書き出しました');
  }
  async function importData(file) {
    try {
      var obj = JSON.parse(await file.text());
      var clean = normalize(obj.state || obj);
      askConfirm(clean.items.length + '件の商品を読み込みます。今のデータは置き換わります。', '読み込む', async function () {
        state = clean;
        await persist();
        render();
        toast('読み込みました');
      });
    } catch (e) { toast('読み込めませんでした（ファイルを確認してください）'); }
  }
  function addCat(n) {
    n = String(n || '').trim().slice(0, 20);
    if (!n) return;
    if (state.categories.indexOf(n) >= 0) { toast('同じ名前のカテゴリーがあります'); return; }
    state.categories.push(n);
    persist();
    render();
  }
  function renameCat(c) {
    openModal('<form class="dialog" id="rename-form" data-cat="' + esc(c) + '"><h2>カテゴリー名を変更</h2>' +
      '<label class="field"><span>新しい名前</span><input id="rename-input" name="cat" maxlength="20" value="' + esc(c) + '"></label>' +
      '<div class="sheet-actions"><span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">キャンセル</button><button type="submit" class="btn-primary">変更する</button></div></form>');
  }
  function renameCatTo(c, n) {
    n = String(n || '').trim().slice(0, 20);
    closeModal();
    if (!n || n === c) return;
    if (state.categories.indexOf(n) >= 0) { toast('同じ名前のカテゴリーがあります'); return; }
    state.categories = state.categories.map(function (x) { return x === c ? n : x; });
    state.items.forEach(function (i) { if (i.category === c) i.category = n; });
    if (ui.cat === c) ui.cat = n;
    persist();
    render();
  }
  function delCat(c) {
    if (state.categories.length <= 1) { toast('カテゴリーは1つ以上必要です'); return; }
    var rest = state.categories.filter(function (x) { return x !== c; });
    var to = rest.indexOf('その他') >= 0 ? 'その他' : rest[0];
    var n = state.items.filter(function (i) { return i.category === c; }).length;
    askConfirm(n ? '「' + c + '」を削除します。' + n + '件の商品は「' + to + '」に移ります。' : '「' + c + '」を削除します。', '削除する', function () {
      state.categories = rest;
      state.items.forEach(function (i) { if (i.category === c) i.category = to; });
      if (ui.cat === c) ui.cat = null;
      persist();
      render();
    });
  }
  function sample() {
    var t = C.todayStr();
    function mk(name, site, url, category, cycle, agos, price, must) {
      return {
        id: uid(), name: name, site: site, url: url, category: category, must: must !== false, cycle: cycle, notifyBefore: 1,
        price: null, image: null, snoozeUntil: null, createdAt: new Date().toISOString(),
        history: agos.map(function (a) { return { id: uid(), date: C.addDays(t, -a), t: '', price: price, source: 'app' }; })
      };
    }
    state.items.push(
      mk('ミネラルウォーター 2L×6本', 'yodobashi', 'https://www.yodobashi.com/', '飲料', 4, [4, 8, 13, 17, 22], 698),
      mk('トイレットペーパー 12ロール', 'amazon', 'https://www.amazon.co.jp/', '紙類', 28, [29, 57], 1078),
      mk('食器用洗剤 詰め替え', 'rakuten', 'https://www.rakuten.co.jp/', '洗剤・掃除', 30, [28, 58], 498),
      mk('炭酸水 500ml×24本', 'amazon', 'https://www.amazon.co.jp/', '飲料', 14, [11, 25, 39], 1580),
      mk('洗濯用洗剤 詰め替え', 'yodobashi', 'https://www.yodobashi.com/', '洗剤・掃除', 29, [20], 658),
      mk('ティッシュ 5箱', 'amazon', 'https://www.amazon.co.jp/', '紙類', 44, [30], 548),
      mk('歯ブラシ 4本', 'rakuten', 'https://www.rakuten.co.jp/', '衛生用品', 90, [48], 398, false)
    );
    persist();
    render();
    toast('サンプルを入れました（あとで削除できます）');
  }
  function resizeImage(file) {
    return new Promise(function (res, rej) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var sc = Math.min(1, 400 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }

  /* ---------- イベント ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('modal-backdrop')) { closeModal(); return; }
    if (t.classList && t.classList.contains('drawer-backdrop')) { ui.drawer = false; render(); return; }
    var el = t.closest && t.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action, id = el.dataset.id, it;
    switch (a) {
      case 'drawer': ui.drawer = true; render(); break;
      case 'closeDrawer': ui.drawer = false; setTimeout(render, 0); break;
      case 'add': ui.drawer = false; render(); openItemForm(null); break;
      case 'edit': openItemForm(id); break;
      case 'buy':
        if (el.dataset.nolink) { e.preventDefault(); toast('商品ページのリンクが未登録です'); openItemForm(id); }
        else buy(id);
        break;
      case 'confirmOk': { var fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn(); break; }
      case 'snooze': snooze(id); break;
      case 'site': ui.site = el.dataset.site; render(); break;
      case 'catPick': openCatPick(); break;
      case 'setCat': ui.cat = el.dataset.cat === '__all' ? null : el.dataset.cat; closeModal(); render(); break;
      case 'setMust': it = getItem(id); if (it) { it.must = el.dataset.v === '1'; persist(); render(); } break;
      case 'cycle': it = getItem(id); if (it) { it.cycle = clampInt(it.cycle + Number(el.dataset.d), 1, 365, it.cycle); if (it.notifyBefore > it.cycle) it.notifyBefore = it.cycle; persist(); render(); } break;
      case 'notify': it = getItem(id); if (it) { it.notifyBefore = clampInt(it.notifyBefore + Number(el.dataset.d), 0, Math.min(30, it.cycle), it.notifyBefore); persist(); render(); } break;
      case 'applyAvg': it = getItem(id); if (it) { var av = avgInterval(it); if (av) { it.cycle = Math.max(1, Math.round(av)); persist(); render(); toast(it.cycle + '日ごとに変更しました'); } } break;
      case 'addHist': openHistForm(id, null); break;
      case 'editHist': openHistForm(id, el.dataset.hid); break;
      case 'deleteHist':
        it = getItem(id);
        if (it) {
          var hid = el.dataset.hid;
          askConfirm('この購入記録を削除します。', '削除する', function () {
            it.history = it.history.filter(function (x) { return x.id !== hid; });
            persist(); render(); toast('削除しました');
          });
        }
        break;
      case 'deleteItem':
        it = getItem(id);
        if (it) {
          askConfirm('「' + it.name + '」を削除します。購入履歴も消えます。', '削除する', function () {
            state.items = state.items.filter(function (x) { return x.id !== id; });
            persist(); location.hash = '#home'; render(); toast('削除しました');
          });
        }
        break;
      case 'clearPhoto': {
        form.photo = null;
        var f = document.getElementById('item-form');
        var prev = document.getElementById('photo-prev');
        if (prev && f) prev.innerHTML = IL[kindOf(f.elements.category.value)];
        el.remove();
        break;
      }
      case 'closeModal': closeModal(); break;
      case 'retYes': retAnswer(true); break;
      case 'retNo': retAnswer(false); break;
      case 'enableNotify': enableNotify(); break;
      case 'disableNotify': disableNotify(); break;
      case 'testNotify': testNotify(); break;
      case 'install': doInstall(); break;
      case 'doUpdate': doUpdate(); break;
      case 'export': exportData(); break;
      case 'renameCat': renameCat(el.dataset.cat); break;
      case 'delCat': delCat(el.dataset.cat); break;
      case 'sample': sample(); break;
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') {
      ui.q = t.value;
      var b = document.getElementById('home-body');
      if (b) b.innerHTML = homeBody();
    } else if (t.name === 'url' && t.form && t.form.id === 'item-form') {
      var s = detectSite(t.value.trim());
      if (s) { var r = t.form.querySelector('input[name=site][value=' + s + ']'); if (r) r.checked = true; }
    }
  });
  document.addEventListener('change', async function (e) {
    var t = e.target;
    if (t.id === 'photo-file' && t.files && t.files[0]) {
      try {
        form.photo = await resizeImage(t.files[0]);
        document.getElementById('photo-prev').innerHTML = '<img src="' + form.photo + '" alt="">';
      } catch (err) { toast('写真を読み込めませんでした'); }
    } else if (t.id === 'import-file' && t.files && t.files[0]) {
      await importData(t.files[0]);
      t.value = '';
    } else if (t.id === 'qs' || t.id === 'qe') {
      state.settings[t.id === 'qs' ? 'quietStart' : 'quietEnd'] = parseInt(t.value, 10);
      persist(); render(); toast('保存しました');
    } else if (t.name === 'category' && t.form && t.form.id === 'item-form') {
      var it = getItem(t.form.dataset.id);
      var hasPhoto = form.photo || (form.photo === undefined && it && it.image);
      if (!hasPhoto) document.getElementById('photo-prev').innerHTML = IL[kindOf(t.value)];
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'item-form') { e.preventDefault(); saveItem(f); }
    else if (f.id === 'hist-form') { e.preventDefault(); saveHist(f); }
    else if (f.id === 'cat-form') { e.preventDefault(); addCat(new FormData(f).get('cat')); }
    else if (f.id === 'rename-form') { e.preventDefault(); renameCatTo(f.dataset.cat, new FormData(f).get('cat')); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalRoot.innerHTML) closeModal();
      else if (ui.drawer) { ui.drawer = false; render(); }
    }
  });
  window.addEventListener('hashchange', function () { ui.drawer = false; render(); window.scrollTo(0, 0); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state) { render(); checkPending(); checkUpdate(false); }
  });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (state) render(); });

  /* ---------- アップデート ---------- */
  async function checkUpdate(force) {
    if (!force && Date.now() - lastVerCheck < 30 * 60 * 1000) return;
    lastVerCheck = Date.now();
    try {
      var r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      var v = await r.json();
      if (v && typeof v.version === 'string' && v.version !== APP_VERSION && ui.updateReady !== v.version) {
        ui.updateReady = v.version.slice(0, 20);
        ui.updateNote = typeof v.note === 'string' ? v.note.slice(0, 80) : '';
        render();
      }
    } catch (e) { /* オフラインなど */ }
  }
  async function doUpdate() {
    toast('更新しています…');
    try {
      var reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) { /* そのまま読み直す */ }
    location.reload();
  }

  /* ---------- 起動 ---------- */
  async function init() {
    var s = null;
    try { s = await DB.load(); } catch (e) { s = null; }
    try { state = s ? normalizeLoaded(s) : defaultState(); } catch (e) { state = defaultState(); }
    render();
    checkPending();
    checkUpdate(true);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 無視 */ }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function () {
        if (state.settings.notifyEnabled) return registerSync().then(function () { if (route().name === 'settings') render(); });
      }).catch(function () { syncStatus = 'unsupported'; });
    } else { syncStatus = 'unsupported'; }
  }
  init();
})();
