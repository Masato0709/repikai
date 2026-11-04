/* リピ買い：画面と操作 */
(function () {
  'use strict';
  var C = self.RepiCore, DB = self.RepiDB;
  var APP_VERSION = '1.1.5';
  var SITES = { amazon: 'Amazon', yodobashi: 'ヨドバシ.com', rakuten: '楽天', other: 'その他' };
  var SITE_KEYS = Object.keys(SITES);
  var DEFAULT_CATS = ['飲料', '食品', '洗剤・掃除', '紙類', '衛生用品', 'その他'];
  var CYCLE_PRESETS = [7, 14, 30, 60, 90];
  var CONFIRM_MODES = ['ask', 'auto', 'none'];
  var WD = '日月火水木金土';
  var app = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');
  var toastEl = document.getElementById('toast');

  var state = null;
  var memoryOnly = false;
  var deferredInstall = null;
  var syncStatus = 'unknown';
  var lastVerCheck = 0;
  var ui = { site: 'all', cat: null, q: '', drawer: false };
  var form = { photo: undefined, fromShare: false };
  var sharePhoto = null;
  var pendingConfirm = null;
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
    share: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>', 20),
    cycle: svg('<path d="M20 12a8 8 0 0 1-14.3 4.9"/><path d="M4 12A8 8 0 0 1 18.3 7.1"/><path d="M18 3v4.5h-4.5"/><path d="M6 21v-4.5h4.5"/>', 20),
    cart: svg('<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>', 40),
    photo: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', 40)
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
  function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
  function okId(v) { return typeof v === 'string' && /^[a-z0-9]{4,40}$/i.test(v); }
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
  function amazonAsin(x) {
    var m = x.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|o\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    return m ? m[1].toUpperCase() : null;
  }
  /* 保存するリンクを整える（Amazonは短い形にする） */
  function tidyUrl(u) {
    var s = safeUrl(u);
    if (!s) return null;
    var x = new URL(s);
    if (/(^|\.)amazon\.co\.jp$/.test(x.hostname)) {
      var a = amazonAsin(x);
      if (a) return 'https://www.amazon.co.jp/dp/' + a;
    }
    return s;
  }
  /* 同じ商品かどうかを見分けるための鍵 */
  function urlKey(u) {
    var s = safeUrl(u || '');
    if (!s) return '';
    var x = new URL(s);
    if (/amazon\./.test(x.hostname)) { var a = amazonAsin(x); if (a) return 'amazon:' + a; }
    return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '');
  }
  /* 共有で届いた題名から、お店の名前などの余分な文字を取り除く */
  function cleanTitle(t, site) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^Amazon\.co\.jp\s*[:：]\s*/i, '').replace(/^Amazon\s*[|｜]\s*/i, '');
    if (site === 'amazon') { var i = t.lastIndexOf(' : '); if (i > 4) t = t.slice(0, i); }
    t = t.replace(/^【楽天市場】\s*/, '');
    if (site === 'rakuten') { var j = t.lastIndexOf('：'); if (j > 4) t = t.slice(0, j); }
    t = t.replace(/^ヨドバシ\.com\s*[-－]\s*/, '').replace(/\s*通販\s*【[^】]*】.*$/, '').replace(/\s*通販$/, '');
    t = t.replace(/\s*[-－|｜]\s*(Amazon\.co\.jp|ヨドバシ\.com|楽天市場)\s*$/i, '');
    return t.trim().slice(0, 60);
  }
  /* 写真として使えるもの：端末で縮めた画像か、https の画像アドレス */
  function okImage(x) {
    if (typeof x !== 'string') return null;
    if (x.indexOf('data:image/') === 0) return x;
    var u = safeUrl(x);
    return u && u.indexOf('https:') === 0 ? u : null;
  }
  function isImageUrl(u) {
    try {
      var x = new URL(u);
      return /\.(jpe?g|png|webp|gif|avif)$/i.test(x.pathname) ||
        /(^|\.)(media-amazon\.com|images-amazon\.com|ssl-images-amazon\.com|image\.rakuten\.co\.jp|thumbnail\.image\.rakuten\.co\.jp|image\.yodobashi\.com)$/.test(x.hostname);
    } catch (e) { return false; }
  }
  function allUrls(s) { return String(s || '').match(/https?:\/\/[^\s"'<>]+/g) || []; }
  function findUrl(s) { var m = String(s || '').match(/https?:\/\/[^\s"'<>]+/); return m ? m[0] : ''; }

  var toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2800);
  }

  /* ---------- データ ---------- */
  /* 1つの「品目」に、1つ以上の「銘柄」（お店の商品ページ）がぶら下がる形で持つ */
  function defaultState() {
    return {
      version: 2, items: [], categories: DEFAULT_CATS.slice(),
      settings: { quietStart: 22, quietEnd: 9, notifyEnabled: false, confirmMode: 'ask' },
      pending: [], notified: {}, lastShared: null
    };
  }
  function normVariant(v) {
    return {
      id: okId(v.id) ? v.id : uid(),
      name: str(v.name, 60) || '名前なし',
      url: tidyUrl(v.url || '') || '',
      site: SITE_KEYS.indexOf(v.site) >= 0 ? v.site : 'other',
      image: okImage(v.image),
      price: numOrNull(v.price),
      createdAt: String(v.createdAt || new Date().toISOString())
    };
  }
  function normEntry(it, cats) {
    var isV1 = !Array.isArray(it.variants) || !it.variants.length;
    var variants = isV1
      ? [normVariant({ id: uid(), name: it.name, url: it.url, site: it.site, image: it.image, price: it.price, createdAt: it.createdAt })]
      : it.variants.map(normVariant);
    var seen = {};
    variants = variants.filter(function (v) { if (seen[v.id]) return false; seen[v.id] = 1; return true; });
    var vids = variants.map(function (v) { return v.id; });
    return {
      id: okId(it.id) ? it.id : uid(),
      name: isV1 ? '' : str(it.name, 30),
      category: typeof it.category === 'string' && it.category ? it.category.slice(0, 20) : cats[0],
      must: it.must !== false,
      cycle: clampInt(it.cycle, 1, 365, 7),
      notifyBefore: clampInt(it.notifyBefore, 0, 30, 1),
      snoozeUntil: isDate(it.snoozeUntil) ? it.snoozeUntil : null,
      suggestOff: typeof it.suggestOff === 'number' && it.suggestOff >= 0 ? Math.floor(it.suggestOff) : null,
      createdAt: String(it.createdAt || new Date().toISOString()),
      variants: variants,
      history: Array.isArray(it.history) ? it.history.filter(function (h) { return h && isDate(h.date); }).map(function (h) {
        return {
          id: okId(h.id) ? h.id : uid(), date: h.date, t: String(h.t || ''), price: numOrNull(h.price),
          source: h.source === 'app' ? 'app' : 'manual',
          variantId: vids.indexOf(h.variantId) >= 0 ? h.variantId : vids[0]
        };
      }) : []
    };
  }
  function normalize(s) {
    if (!s || !Array.isArray(s.items)) throw new Error('bad data');
    var cats = Array.isArray(s.categories) ? s.categories.filter(function (c) { return typeof c === 'string' && c.trim(); }).map(function (c) { return c.trim().slice(0, 20); }) : [];
    if (!cats.length) cats = DEFAULT_CATS.slice();
    var st = s.settings || {};
    return {
      version: 2,
      items: s.items.filter(function (it) { return it && typeof it === 'object'; }).map(function (it) { return normEntry(it, cats); }),
      categories: cats,
      settings: {
        quietStart: clampInt(st.quietStart, 0, 23, 22), quietEnd: clampInt(st.quietEnd, 0, 23, 9),
        notifyEnabled: !!st.notifyEnabled,
        confirmMode: CONFIRM_MODES.indexOf(st.confirmMode) >= 0 ? st.confirmMode : 'ask'
      },
      pending: [], notified: {}, lastShared: null
    };
  }
  function normalizeLoaded(s) {
    var n = normalize(s);
    var pend = Array.isArray(s.pending) ? s.pending : (s.pending ? [s.pending] : []);
    n.pending = pend.filter(function (p) { return p && okId(p.itemId) && okId(p.histId); }).map(function (p) {
      return { itemId: p.itemId, histId: p.histId, at: Number(p.at) || 0 };
    });
    if (s.notified && typeof s.notified === 'object') {
      Object.keys(s.notified).forEach(function (k) { if (okId(k) && isDate(s.notified[k])) n.notified[k] = s.notified[k]; });
    }
    if (s.lastShared && okId(s.lastShared.itemId) && okId(s.lastShared.variantId)) {
      n.lastShared = { itemId: s.lastShared.itemId, variantId: s.lastShared.variantId, at: Number(s.lastShared.at) || 0 };
    }
    return n;
  }
  async function persist() {
    if (memoryOnly) return;
    var ok = await DB.save(state);
    if (!ok) { memoryOnly = true; toast('この環境では保存できません（お試し表示のみ）'); }
  }

  function getItem(id) { return state.items.find(function (i) { return i.id === id; }); }
  function getVariant(e, vid) { return e.variants.find(function (v) { return v.id === vid; }) || null; }
  function sortedHistory(e) {
    return e.history.slice().sort(function (a, b) {
      return a.date === b.date ? String(b.t).localeCompare(String(a.t)) : b.date.localeCompare(a.date);
    });
  }
  /* 次に買う銘柄 = 最後に買った銘柄 */
  function curVariant(e) {
    var hs = sortedHistory(e);
    for (var i = 0; i < hs.length; i++) { var v = getVariant(e, hs[i].variantId); if (v) return v; }
    return e.variants[0];
  }
  function multi(e) { return e.variants.length > 1; }
  function vCount(e, v) { return e.history.filter(function (h) { return h.variantId === v.id; }).length; }
  function vPriced(e, v) { return sortedHistory(e).filter(function (h) { return h.variantId === v.id && h.price != null; }); }
  function vLastPrice(e, v) { var p = vPriced(e, v); return p.length ? p[0].price : v.price; }
  function vPrevPrice(e, v) { var p = vPriced(e, v); return p.length > 1 ? p[1].price : null; }
  function avgInterval(e) {
    var ds = Array.from(new Set(e.history.map(function (h) { return h.date; }))).sort().slice(-11);
    if (ds.length < 3) return null;
    var sum = 0;
    for (var i = 1; i < ds.length; i++) sum += C.diffDays(ds[i], ds[i - 1]);
    return Math.round(sum / (ds.length - 1) * 10) / 10;
  }
  /* 周期の提案：3回以上買っていて、設定と2割以上ずれているときだけ */
  function suggestion(e) {
    if (!e.must) return null;
    var avg = avgInterval(e);
    if (!avg) return null;
    var to = Math.max(1, Math.round(avg));
    if (to === e.cycle || Math.abs(avg - e.cycle) / e.cycle < 0.2) return null;
    if (e.suggestOff != null && e.history.length <= e.suggestOff) return null;
    return { avg: avg, to: to };
  }
  function status(e) {
    var today = C.todayStr();
    var d = C.dueInfo(e, today);
    var never = !e.history.length;
    var level, label;
    if (!e.must) { level = 'occ'; label = d.last ? '前回 ' + fmtMD(d.last) : '未購入'; }
    else if (never) { level = 'hot'; label = '未購入'; }
    else if (C.isStale(e, today)) { level = 'stale'; label = C.diffDays(today, d.last) + '日買っていない'; }
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
  function tintOf(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return 'var(--tint' + (h % 3 + 1) + ')';
  }
  /* 端末に保存した写真を選ぶボタン（共有がうまくいかないときも確実に付けられる） */
  function pickBtn(e, v, label, cls) {
    return '<label class="' + (cls || 'btn-ghost') + ' as-btn">' + ICON.photo.replace(/width="40" height="40"/, 'width="20" height="20"') + esc(label) +
      '<input type="file" class="pick-photo" accept="image/*" data-id="' + esc(e.id) + '" data-vid="' + esc(v.id) + '" hidden></label>';
  }
  function entryOfVariant(vid) {
    return state.items.find(function (e) { return e.variants.some(function (v) { return v.id === vid; }); }) || null;
  }
  function imgTag(src, alt) { return '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" referrerpolicy="no-referrer">'; }
  function thumbInner(v, cat) { return v && v.image ? imgTag(v.image) : IL[kindOf(cat)]; }
  function siteLabel(v) { return SITES[v.site] || 'その他'; }
  function buyLabel(v) { return v.site === 'other' ? 'サイトで購入する' : siteLabel(v) + 'で購入する'; }
  /* 購入ボタンは本物のリンク（ブラウザで商品ページが開く） */
  function buyAttrs(e, v) {
    var u = safeUrl(v.url || '');
    var base = 'data-action="buy" data-id="' + esc(e.id) + '" data-vid="' + esc(v.id) + '"';
    return u ? 'href="' + esc(u) + '" target="_blank" rel="noopener" ' + base : 'href="#" data-nolink="1" ' + base;
  }
  function entryLabel(e) { return e.name || curVariant(e).name; }

  /* ---------- 画面の枠 ---------- */
  function route() {
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('item-') === 0) return { name: 'item', id: h.slice(5) };
    if (h === 'history') return { name: 'history' };
    if (h === 'prefs') return { name: 'settings' };
    if (h === 'all-items') return { name: 'items' };
    return { name: 'home' };
  }
  function counts() {
    var today = 0, soon = 0;
    state.items.forEach(function (e) {
      if (!e.must) return;
      var s = status(e);
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
    return state.items.filter(function (e) {
      var siteOk = ui.site === 'all' || e.variants.some(function (v) { return v.site === ui.site; });
      var qOk = !q || (e.name || '').toLowerCase().indexOf(q) >= 0 || e.variants.some(function (v) { return v.name.toLowerCase().indexOf(q) >= 0; });
      return siteOk && qOk && (!ui.cat || e.category === ui.cat);
    });
  }
  function installHint() {
    if (!deferredInstall) return '';
    return '<div class="hint"><span>ホーム画面に追加すると、アプリのように使えて、共有からの登録や通知も使えます</span><button class="btn-sub" data-action="install">追加する</button></div>';
  }
  function suggestBanner() {
    var cands = state.items.map(function (e) { return { e: e, s: suggestion(e) }; }).filter(function (x) { return x.s && !C.isStale(x.e); });
    if (!cands.length) return '';
    cands.sort(function (a, b) { return b.e.history.length - a.e.history.length; });
    var x = cands[0], eid = esc(x.e.id);
    return '<div class="sug-banner">' + ICON.cycle + '<span><b>' + esc(entryLabel(x.e)) + '</b> は、実際は平均 <b>' + x.s.avg + '日</b> ごとに買っています。周期を ' + x.e.cycle + '日 → <b>' + x.s.to + '日</b> に変えますか？</span>' +
      '<div class="sug-actions"><button class="btn-sub" data-action="applyAvg" data-id="' + eid + '">' + x.s.to + '日ごとにする</button>' +
      '<button class="link-btn" data-action="dismissSuggest" data-id="' + eid + '">今は変えない</button></div></div>';
  }
  function viewHome() {
    var tabs = ['all', 'amazon', 'yodobashi', 'rakuten'].map(function (k) {
      return '<button data-action="site" data-site="' + k + '" class="' + (ui.site === k ? 'on' : '') + '">' + (k === 'all' ? 'すべて' : SITES[k]) + '</button>';
    }).join('');
    return '<div class="search"><label>' + ICON.search + '<input id="q" type="search" placeholder="登録した商品から探す" value="' + esc(ui.q) + '" aria-label="商品を検索"></label></div>' +
      '<nav class="nav" aria-label="絞り込み">' + tabs +
      '<button data-action="catPick" class="' + (ui.cat ? 'on' : '') + '">' + (ui.cat ? 'カテゴリー：' + esc(ui.cat) : 'カテゴリー') + '</button>' +
      '<a href="#history">購入履歴</a></nav>' +
      '<div class="wrap"><div class="ttl"><h1>そろそろ買う</h1><small>REPEAT ITEMS</small></div>' + installHint() + suggestBanner() +
      '<div id="home-body">' + homeBody() + '</div></div>';
  }
  function homeBody() {
    if (!state.items.length) return emptyState();
    var list = filtered();
    if (!list.length) return '<p class="empty-col center">条件に合う商品がありません</p>';
    var all = list.map(function (e) { return { e: e, s: status(e) }; });
    var bySoon = function (a, b) { return (a.s.left - b.s.left) || (b.e.history.length - a.e.history.length); };
    var must = all.filter(function (x) { return x.e.must && x.s.level !== 'stale'; }).sort(bySoon);
    var today = must.filter(function (x) { return x.s.level === 'hot' || x.s.level === 'over'; });
    var soon = must.filter(function (x) { return x.s.level === 'warm'; });
    var later = must.filter(function (x) { return x.s.level === 'calm'; });
    var occ = all.filter(function (x) { return !x.e.must; }).sort(function (a, b) { return b.e.history.length - a.e.history.length; });
    var stale = all.filter(function (x) { return x.s.level === 'stale'; }).sort(function (a, b) { return a.s.left - b.s.left; });
    function col(title, cls, arr) {
      return '<section class="col"><div class="col-h"><span class="dot ' + cls + '"></span>' + title + '<span class="cnt">' + arr.length + '</span></div>' +
        (arr.length ? arr.map(function (x, i) { return rowHtml(x, i + 1); }).join('') : '<p class="empty-col">ありません</p>') + '</section>';
    }
    function sub(title, note, arr) {
      return '<section class="occ"><div class="col-h"><span class="dot calm"></span>' + title + '<span class="note-inline">' + note + '</span><span class="cnt">' + arr.length + '</span></div>' +
        '<div class="occ-grid">' + arr.map(cardHtml).join('') + '</div></section>';
    }
    var html = '<div class="cols">' + col('今日・期限切れ', 'hot', today) + col('3日以内', 'warm', soon) + col('それ以降', 'calm', later) + '</div>';
    if (occ.length) html += sub('たまに買う', '通知なし', occ);
    if (stale.length) html += sub('最近買っていない', '通知を止めています。買うと元に戻ります', stale);
    return html;
  }
  /* 前回購入日と、そこから何日たったか */
  function agoText(last) {
    var d = C.diffDays(C.todayStr(), last);
    return d <= 0 ? '今日' : d + '日前';
  }
  function lastLine(s) {
    if (!s.last) return '<div class="last-line muted">まだ購入していません</div>';
    return '<div class="last-line"><span class="muted">前回購入</span> ' + fmtMDW(s.last) + ' <span class="ago">' + agoText(s.last) + '</span></div>';
  }
  function brandLine(e) {
    if (!multi(e)) return '';
    return '<div class="brand-line"><span>' + esc(e.name) + ' ・ 銘柄' + e.variants.length + '</span><button class="link-btn" data-action="brands" data-id="' + esc(e.id) + '">ほかの銘柄</button></div>';
  }
  function rowHtml(x, n) {
    var e = x.e, s = x.s, v = curVariant(e), id = esc(e.id);
    var snooze = (s.level !== 'calm' && !s.never) ? '<button class="link-btn" data-action="snooze" data-id="' + id + '">まだある</button>' : '';
    return '<div class="row"><a class="thumb" href="#item-' + id + '" style="background:' + tintOf(v.id) + '" aria-label="' + esc(v.name) + 'の詳細">' + thumbInner(v, e.category) + '</a>' +
      '<div class="row-body"><div class="row-top"><span class="no">' + n + '</span><span class="site">' + siteLabel(v) + '</span><span class="times">購入' + e.history.length + '回</span>' + snooze + '</div>' +
      '<a class="row-name" href="#item-' + id + '">' + esc(v.name) + '</a>' + brandLine(e) + lastLine(s) +
      '<div class="row-meta"><span>' + yen(vLastPrice(e, v)) + '</span><span class="tag ' + s.level + '">' + s.label + '</span>' +
      '<a class="btn-buy ' + s.level + '" ' + buyAttrs(e, v) + '>購入する</a></div></div></div>';
  }
  function cardHtml(x) {
    var e = x.e, v = curVariant(e), id = esc(e.id);
    return '<div class="occ-card"><a class="thumb" href="#item-' + id + '" style="background:' + tintOf(v.id) + '" aria-label="' + esc(v.name) + 'の詳細">' + thumbInner(v, e.category) + '</a>' +
      '<div class="occ-body"><a class="row-name" href="#item-' + id + '">' + esc(v.name) + '</a><span class="occ-meta">' + siteLabel(v) + ' ・ 購入' + e.history.length + '回</span>' + lastLine(x.s) + '</div>' +
      '<a class="btn-buy occ" ' + buyAttrs(e, v) + '>購入する</a></div>';
  }
  function shareHowTo() {
    return '<ol class="howto"><li>Chromeで商品ページを開き、右上の「⋮」→「共有」→「<b>リピ買い</b>」を選ぶ</li>' +
      '<li>商品名とリンクが入った登録画面が開くので、周期を選んで保存する</li>' +
      '<li>写真は、商品写真を長押し→「画像をダウンロード」してから、商品画面の「<b>写真を選ぶ</b>」で付ける</li></ol>';
  }
  function emptyState() {
    return '<div class="empty"><div class="thumb xl" style="background:var(--tint1)">' + IL.water + '</div>' +
      '<h2>まだ商品が登録されていません</h2>' +
      '<p>よく買う日用品と、その商品ページのリンクを登録しましょう。<br>買う周期に合わせて、買いどきをお知らせします。</p>' +
      '<div class="howto-box"><b>かんたんな登録のしかた</b>' + shareHowTo() + '</div>' +
      '<div class="empty-actions"><button class="btn-primary" data-action="add">手で登録する</button>' +
      '<button class="btn-ghost" data-action="sample">サンプルで試してみる</button></div></div>';
  }

  /* ---------- 商品詳細 ---------- */
  function cycleChips(action, cur, eid) {
    return '<div class="chips" role="group" aria-label="よく使う周期">' + CYCLE_PRESETS.map(function (d) {
      return '<button type="button" class="chip' + (d === cur ? ' on' : '') + '" data-action="' + action + '" data-v="' + d + '"' + (eid ? ' data-id="' + eid + '"' : '') + '>' + d + '日</button>';
    }).join('') + '</div>';
  }
  function viewItem(id) {
    var e = getItem(id);
    if (!e) return '<div class="wrap"><p>商品が見つかりません。</p><a href="#home">ホームへ戻る</a></div>';
    var s = status(e), eid = esc(e.id), v = curVariant(e), vid = esc(v.id);
    var lp = vLastPrice(e, v), pp = vPrevPrice(e, v);
    var diff = (lp != null && pp != null && lp !== pp) ? ' <span class="muted">（前々回 ' + yen(pp) + ' から ' + (lp > pp ? '+' : '−') + '¥' + Math.abs(lp - pp).toLocaleString('ja-JP') + '）</span>' : '';
    var sg = suggestion(e), avg = avgInterval(e), suggestHtml;
    if (sg) {
      suggestHtml = '<div class="suggest"><span>実際は平均 <b>' + sg.avg + '日</b> ごとに買っています</span><button class="btn-sub" data-action="applyAvg" data-id="' + eid + '">' + sg.to + '日ごとにする</button><button class="link-btn" data-action="dismissSuggest" data-id="' + eid + '">今は変えない</button></div>';
    } else if (avg) {
      suggestHtml = '<div class="suggest calm">実際の平均は ' + avg + '日 です</div>';
    } else {
      suggestHtml = '<div class="suggest calm">3回以上買うと、実際の周期を計算して、ずれが大きいときにお知らせします</div>';
    }
    var hs = sortedHistory(e);
    var rows = hs.map(function (h, i) {
      var nx = hs[i + 1], hv = getVariant(e, h.variantId);
      var gap = nx ? '前回から' + C.diffDays(h.date, nx.date) + '日' : 'はじめての記録';
      return '<div class="hrow"><div class="hdate"><b>' + fmtMDW(h.date) + '</b><small>' + gap + '</small></div>' +
        '<span class="hprice">' + yen(h.price) + (multi(e) && hv ? '<small>' + esc(hv.name) + '</small>' : '') + '</span><span class="hsrc">' + (h.source === 'app' ? 'アプリから' : '手動') + '</span>' +
        '<button class="icon-btn sm" data-action="editHist" data-id="' + eid + '" data-hid="' + esc(h.id) + '" aria-label="この履歴を編集">' + ICON.pencil + '</button></div>';
    }).join('');
    var nb = e.notifyBefore === 0 ? '当日' : e.notifyBefore + '日前';
    var brands = multi(e) ? '<section class="card"><h2>銘柄 <span class="muted small">次は最後に買った銘柄を表示します</span></h2><div class="vlist">' +
      e.variants.map(function (x) {
        return '<div class="vrow' + (x.id === v.id ? ' cur' : '') + '"><span class="thumb sm" style="background:' + tintOf(x.id) + '">' + thumbInner(x, e.category) + '</span>' +
          '<span class="g-name">' + esc(x.name) + '<small>' + siteLabel(x) + ' ・ 購入' + vCount(e, x) + '回 ・ ' + yen(vLastPrice(e, x)) + (x.id === v.id ? ' ・ 前回買った銘柄' : '') + '</small></span>' +
          '<button class="icon-btn sm" data-action="edit" data-id="' + eid + '" data-vid="' + esc(x.id) + '" aria-label="' + esc(x.name) + 'を編集">' + ICON.pencil + '</button>' +
          '<a class="btn-buy calm" ' + buyAttrs(e, x) + '>購入する</a></div>';
      }).join('') + '</div></section>' : '';
    return '<div class="wrap"><a class="back" href="#home">' + ICON.back + 'そろそろ買う</a><div class="detail"><div class="dcol">' +
      '<section class="card"><div class="d-head"><div class="thumb lg" style="background:' + tintOf(v.id) + '">' + thumbInner(v, e.category) + '</div>' +
      '<div class="d-title">' + (multi(e) ? '<span class="eyebrow">' + esc(e.name) + '</span>' : '') + '<h1>' + esc(v.name) + '</h1><span class="tag ' + s.level + '">' + s.label + '</span></div></div>' +
      '<div class="seg2" role="group" aria-label="種類">' +
      '<button data-action="setMust" data-id="' + eid + '" data-v="1" class="' + (e.must ? 'on' : '') + '" aria-pressed="' + e.must + '">' + ICON.star + '必ず買う（通知あり）</button>' +
      '<button data-action="setMust" data-id="' + eid + '" data-v="0" class="' + (!e.must ? 'on' : '') + '" aria-pressed="' + !e.must + '">たまに買う（通知なし）</button></div>' +
      '<dl class="info"><dt>サイト</dt><dd>' + siteLabel(v) + '</dd>' +
      '<dt>リンク</dt><dd class="trunc">' + (v.url ? esc(v.url) : '<span class="muted">未登録</span>') + '</dd>' +
      '<dt>カテゴリー</dt><dd>' + esc(e.category) + '</dd>' +
      '<dt>購入回数</dt><dd><b>' + e.history.length + '回</b></dd>' +
      '<dt>前回価格</dt><dd><b>' + yen(lp) + '</b>' + diff + '</dd>' +
      '<dt>前回購入</dt><dd>' + (s.last ? fmtLong(s.last) + ' <span class="ago">' + agoText(s.last) + '</span>' : 'まだ購入していません') + '</dd>' +
      (e.must && !s.never && s.level !== 'stale' ? '<dt>次の買いどき</dt><dd><b>' + fmtLong(s.due) + '</b></dd>' : '') + '</dl>' +
      (s.level === 'stale' ? '<p class="note stale-note">しばらく買っていないため、通知を止めています。また買うと元に戻ります。</p>' : '') +
      (!v.image ? '<p class="note">写真は、Chromeで商品写真を長押し→「画像をダウンロード」してから、「写真を選ぶ」で付けられます。</p>' : '') +
      '<div class="btn-row"><button class="btn-ghost" data-action="edit" data-id="' + eid + '" data-vid="' + vid + '">' + ICON.pencil + '編集する</button>' +
      pickBtn(e, v, v.image ? '写真を変える' : '写真を選ぶ') +
      (v.image && v.image.indexOf('data:') === 0 ? '<button class="btn-ghost" data-action="recrop" data-id="' + eid + '" data-vid="' + vid + '">写真を調整</button>' : '') +
      '<button class="btn-ghost" data-action="addBrand" data-id="' + eid + '">' + ICON.plus + '銘柄を追加</button></div></section>' +
      brands +
      (e.must ? '<section class="card"><h2>周期と通知</h2><div class="steps">' +
        '<div class="step"><span>買う周期</span><div class="stepper"><button data-action="cycle" data-d="-1" data-id="' + eid + '" aria-label="1日減らす">−</button><label class="step-num"><input id="d-cycle" type="number" min="1" max="365" inputmode="numeric" enterkeyhint="done" value="' + e.cycle + '" data-id="' + eid + '" aria-label="買う周期（日数）"><span>日ごと</span></label><button data-action="cycle" data-d="1" data-id="' + eid + '" aria-label="1日増やす">＋</button></div>' +
        '</div>' +
        '<div class="step"><span>通知のタイミング</span><div class="stepper"><button data-action="notify" data-d="-1" data-id="' + eid + '" aria-label="1日減らす">−</button><b>' + nb + '</b><button data-action="notify" data-d="1" data-id="' + eid + '" aria-label="1日増やす">＋</button></div></div>' +
        '</div><div class="step chips-step"><span>よく使う周期</span>' + cycleChips('setCycle', e.cycle, eid) + '</div>' + suggestHtml + '</section>' : '') +
      '<div class="d-actions"><a class="btn-primary big" ' + buyAttrs(e, v) + '>' + buyLabel(v) + ICON.ext + '</a>' +
      (e.must && !s.never ? '<button class="btn-ghost big" data-action="snooze" data-id="' + eid + '">まだある</button>' : '') + '</div></div>' +
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
        g.items.map(function (e) {
          var s = status(e), v = curVariant(e);
          return '<a class="grow" href="#item-' + esc(e.id) + '"><span class="thumb sm" style="background:' + tintOf(v.id) + '">' + thumbInner(v, e.category) + '</span>' +
            '<span class="g-name">' + esc(v.name) + '<small>' + (multi(e) ? esc(e.name) + '（銘柄' + e.variants.length + '）・ ' : '') + siteLabel(v) + ' ・ ' + (e.must ? e.cycle + '日ごと' : 'たまに買う') + ' ・ 購入' + e.history.length + '回' + (s.last ? ' ・ 前回 ' + fmtMD(s.last) + '（' + agoText(s.last) + '）' : '') + '</small></span>' +
            '<span class="tag ' + s.level + '">' + s.label + '</span></a>';
        }).join('') + '</div></section>';
    }).join('') : emptyState();
    return '<div class="wrap narrow"><div class="ttl"><h1>すべての商品</h1><small>ALL ITEMS</small></div>' +
      '<div class="list-actions"><button class="btn-primary" data-action="add">' + ICON.plus + '商品を追加</button></div>' + body + '</div>';
  }

  /* ---------- 購入履歴 ---------- */
  function viewHistory() {
    var all = [];
    state.items.forEach(function (e) { e.history.forEach(function (h) { all.push({ e: e, h: h }); }); });
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
          var v = getVariant(x.e, x.h.variantId) || curVariant(x.e);
          return '<div class="hrow"><div class="hdate"><b>' + fmtMDW(x.h.date) + '</b></div>' +
            '<a class="h-item" href="#item-' + esc(x.e.id) + '">' + esc(v.name) + '<small>' + siteLabel(v) + '</small></a>' +
            '<span class="hprice">' + yen(x.h.price) + '</span><span class="hsrc">' + (x.h.source === 'app' ? 'アプリから' : '手動') + '</span>' +
            '<button class="icon-btn sm" data-action="editHist" data-id="' + esc(x.e.id) + '" data-hid="' + esc(x.h.id) + '" aria-label="この履歴を編集">' + ICON.pencil + '</button></div>';
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
    var modes = [
      ['ask', '毎回聞く', '商品ページから戻ったときに「買えましたか？」と聞きます'],
      ['auto', '自動で購入にする', '「購入する」を押した時点で購入として記録します。違ったら履歴から消せます'],
      ['none', '記録しない', '自動では記録しません。買ったら商品画面の「手動で追加」で記録します']
    ].map(function (m) {
      return '<label class="radio-row"><input type="radio" name="confirmMode" value="' + m[0] + '"' + (st.confirmMode === m[0] ? ' checked' : '') + '><span><b>' + m[1] + '</b><small>' + m[2] + '</small></span></label>';
    }).join('');
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
      '<p class="note">「必ず買う」商品だけが通知の対象です。通知の時刻はChromeが決めるため前後しますが、下の時間帯には届きません。周期の2倍を過ぎ、かつ' + C.STALE_MIN_DAYS + '日以上買っていない商品は「最近買っていない」に移り、通知を止めます。</p></section>' +
      '<section class="card set"><h2>通知しない時間帯</h2><div class="quiet"><select id="qs" aria-label="開始時刻">' + hours(st.quietStart) + '</select><span>から</span>' +
      '<select id="qe" aria-label="終了時刻">' + hours(st.quietEnd) + '</select><span>まで</span></div></section>' +
      '<section class="card set"><h2>購入の記録のしかた</h2><div class="radios">' + modes + '</div></section>' +
      '<section class="card set"><h2>共有から登録する</h2>' + shareHowTo() +
      lastInboxHtml() +
      '<p class="note">「リピ買い」が共有先に出ないときは、ホーム画面に追加してあるか確認してください。追加してあっても出ないときは、ホーム画面のアイコンを一度削除して、もう一度追加してください。</p></section>' +
      '<section class="card set"><h2>カテゴリー</h2><div class="cat-list">' + cats + '</div>' +
      '<form id="cat-form" class="cat-add"><input id="cat-new" name="cat" maxlength="20" placeholder="新しいカテゴリー名" aria-label="新しいカテゴリー名"><button class="btn-ghost" type="submit">追加</button></form></section>' +
      '<section class="card set"><h2>バックアップ</h2><p class="note">データはこの端末の中だけに保存されています。機種変更やブラウザのデータ削除に備えて、ときどきファイルに書き出してください。iPhoneで見たいときも、このファイルを読み込めば同じ内容を表示できます。</p>' +
      '<div class="set-actions"><button class="btn-ghost" data-action="export">ファイルに書き出す</button>' +
      '<label class="btn-ghost as-btn">ファイルから読み込む<input type="file" id="import-file" accept="application/json,.json" hidden></label></div></section>' +
      (deferredInstall ? '<section class="card set"><h2>ホーム画面に追加</h2><p class="note">アプリのように起動でき、共有からの登録や通知も使えるようになります。</p><button class="btn-primary" data-action="install">ホーム画面に追加する</button></section>' : '') +
      '<p class="ver">リピ買い ver ' + APP_VERSION + '</p></div>';
  }

  function lastInboxHtml() {
    var b = ui.lastInbox;
    if (!b) return '';
    var d = new Date(b.at);
    return '<div class="inbox-log"><b>最後に受け取った共有</b><dl class="info">' +
      '<dt>日時</dt><dd>' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + '</dd>' +
      '<dt>写真</dt><dd>' + (b.image ? 'あり（' + esc(b.image.type || '種類不明') + '、' + Math.round(b.image.size / 1024) + 'KB）' : 'なし') + '</dd>' +
      '<dt>題名</dt><dd class="trunc">' + (esc(b.title) || '—') + '</dd>' +
      '<dt>リンク</dt><dd class="trunc">' + (esc(b.url) || '—') + '</dd>' +
      '<dt>文章</dt><dd class="trunc">' + (esc(b.text) || '—') + '</dd></dl></div>';
  }

  /* ---------- モーダル ---------- */
  function openModal(html) { modalRoot.innerHTML = '<div class="modal-backdrop">' + html + '</div>'; }
  function closeModal() { modalRoot.innerHTML = ''; }
  function askConfirm(msg, okLabel, onOk) {
    pendingConfirm = onOk;
    openModal('<div class="dialog confirm" role="alertdialog" aria-label="確認"><p class="confirm-msg">' + esc(msg) + '</p>' +
      '<div class="sheet-actions"><span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">やめる</button>' +
      '<button type="button" class="btn-primary" data-action="confirmOk">' + esc(okLabel) + '</button></div></div>');
  }
  function openCatPick() {
    var opts = ['__all'].concat(state.categories).map(function (c) {
      var on = (c === '__all' && !ui.cat) || c === ui.cat;
      return '<button class="pick-btn ' + (on ? 'on' : '') + '" data-action="setCat" data-cat="' + esc(c) + '">' + (c === '__all' ? 'すべて' : esc(c)) + '</button>';
    }).join('');
    openModal('<div class="dialog"><h2>カテゴリーで絞り込む</h2><div class="pick">' + opts + '</div></div>');
  }
  function openBrands(eid) {
    var e = getItem(eid);
    if (!e) return;
    var cur = curVariant(e);
    openModal('<div class="dialog"><h2>' + esc(e.name || '銘柄') + 'の銘柄</h2><div class="vlist">' + e.variants.map(function (x) {
      return '<div class="vrow' + (x.id === cur.id ? ' cur' : '') + '"><span class="thumb sm" style="background:' + tintOf(x.id) + '">' + thumbInner(x, e.category) + '</span>' +
        '<span class="g-name">' + esc(x.name) + '<small>' + siteLabel(x) + ' ・ 購入' + vCount(e, x) + '回 ・ ' + yen(vLastPrice(e, x)) + (x.id === cur.id ? ' ・ 前回買った銘柄' : '') + '</small></span>' +
        '<a class="btn-buy ' + (x.id === cur.id ? 'hot' : 'calm') + '" ' + buyAttrs(e, x) + '>購入する</a></div>';
    }).join('') + '</div><div class="sheet-actions"><span class="sp"></span><button class="btn-ghost" data-action="closeModal">閉じる</button></div></div>');
  }

  /* 商品の登録・編集フォーム。opts: { id, vid, groupId, prefill, fromShare } */
  function openItemForm(opts) {
    opts = opts || {};
    var e = opts.id ? getItem(opts.id) : null;
    var v = e ? (opts.vid ? getVariant(e, opts.vid) : curVariant(e)) : null;
    if (opts.id && (!e || !v)) return;
    var isNew = !e;
    var group = isNew && opts.groupId ? getItem(opts.groupId) : null;
    var pre = opts.prefill || {};
    form = { photo: pre.image !== undefined ? pre.image : undefined, fromShare: !!opts.fromShare };
    var vals = {
      name: v ? v.name : (pre.name || ''),
      url: v ? v.url : (pre.url || ''),
      site: v ? v.site : (pre.site || 'amazon'),
      price: v ? vLastPrice(e, v) : null,
      image: v ? v.image : (pre.image || null),
      category: e ? e.category : (group ? group.category : state.categories[0]),
      must: e ? e.must : true,
      cycle: e ? e.cycle : 30,
      notifyBefore: e ? e.notifyBefore : 1,
      gname: e ? e.name : (group ? group.name : '')
    };
    if (form.photo === undefined && isNew) form.photo = null;
    var showImg = form.photo !== undefined ? form.photo : vals.image;
    var sites = SITE_KEYS.map(function (k) {
      return '<label><input type="radio" name="site" value="' + k + '"' + (vals.site === k ? ' checked' : '') + '><span>' + SITES[k] + '</span></label>';
    }).join('');
    var cats = state.categories.map(function (c) {
      return '<option' + (c === vals.category ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    var groupSel = '';
    if (isNew && state.items.length) {
      groupSel = '<label class="field"><span>まとめ方</span><select name="group" id="f-group">' +
        '<option value="">新しい商品として登録する</option>' +
        state.items.map(function (x) {
          return '<option value="' + esc(x.id) + '"' + (group && group.id === x.id ? ' selected' : '') + '>「' + esc(entryLabel(x)) + '」の別の銘柄として追加</option>';
        }).join('') + '</select><small>同じ種類の商品（例：ミネラルウォーターのいろはすと天然水）をまとめると、周期と購入回数を合わせて数えます</small></label>';
    }
    var showGname = !!group || (!isNew && multi(e));
    var title = isNew ? (group ? '銘柄を追加' : '商品を登録') : '商品を編集';
    openModal('<form class="dialog sheet" id="item-form" data-id="' + (e ? esc(e.id) : '') + '" data-vid="' + (v ? esc(v.id) : '') + '" novalidate>' +
      '<h2>' + title + '</h2>' + (form.fromShare ? '<p class="from-share">' + ICON.share + '共有から受け取りました。内容を確認して保存してください</p>' : '') +
      groupSel +
      '<label class="field gname-field"' + (showGname ? '' : ' hidden') + '><span>品目名（まとめた商品の呼び名）</span><input id="f-gname" name="gname" maxlength="30" value="' + esc(vals.gname) + '" placeholder="例：ミネラルウォーター"></label>' +
      '<label class="field"><span>商品名</span><input id="f-name" name="name" maxlength="60" value="' + esc(vals.name) + '" placeholder="例：い・ろ・は・す 540ml×24本"></label>' +
      '<label class="field"><span>商品ページのリンク</span><input id="f-url" name="url" type="url" inputmode="url" value="' + esc(vals.url) + '" placeholder="https://"><small>商品ページのURLを貼り付けると、サイトを自動で選びます</small></label>' +
      '<div class="field"><span>サイト</span><div class="seg">' + sites + '</div></div>' +
      '<div class="entry-fields"' + (group ? ' hidden' : '') + '>' +
      '<label class="field"><span>カテゴリー</span><select id="f-cat" name="category">' + cats + '</select></label>' +
      '<div class="field"><span>種類</span><div class="seg"><label><input type="radio" name="must" value="1"' + (vals.must ? ' checked' : '') + '><span>必ず買う（通知あり）</span></label>' +
      '<label><input type="radio" name="must" value="0"' + (!vals.must ? ' checked' : '') + '><span>たまに買う（通知なし）</span></label></div></div>' +
      '<div class="field"><span>買う周期（日数で入力。1か月なら30）</span><div class="cycle-in"><input id="f-cycle" name="cycle" type="number" min="1" max="365" inputmode="numeric" value="' + vals.cycle + '"><span class="unit">日ごと</span></div>' + cycleChips('formCycle', vals.cycle) + '</div>' +
      '<label class="field"><span>何日前に通知</span><input id="f-nb" name="notifyBefore" type="number" min="0" max="30" inputmode="numeric" value="' + vals.notifyBefore + '"></label>' +
      '</div>' +
      '<div class="field-row"><label class="field"><span>' + (isNew ? '価格（円・任意）' : '前回価格（円）') + '</span><input id="f-price" name="price" type="number" min="0" inputmode="numeric" value="' + (vals.price == null ? '' : vals.price) + '"></label>' +
      (isNew ? '<label class="field"><span>前回買った日（任意）</span><input id="f-last" name="lastDate" type="date" max="' + C.todayStr() + '"></label>' : '') + '</div>' +
      '<div class="field"><span>写真</span><div class="photo-row"><div class="thumb" id="photo-prev" style="background:var(--tint1)">' + (showImg ? imgTag(showImg) : IL[kindOf(vals.category)]) + '</div>' +
      '<label class="btn-ghost sm as-btn">写真を選ぶ<input type="file" id="form-photo-file" accept="image/*" hidden></label>' +
      (showImg ? '<button type="button" class="link-btn" data-action="clearPhoto">写真を外す</button>' : '') +
      '<small class="photo-note">Chromeで商品写真を長押し→「画像をダウンロード」してから選べます</small></div></div>' +
      '<p class="form-err" id="form-err" role="alert"></p>' +
      '<div class="sheet-actions">' + (!isNew ? '<button type="button" class="link-btn danger" data-action="deleteItem" data-id="' + esc(e.id) + '" data-vid="' + esc(v.id) + '">' + (multi(e) ? 'この銘柄を削除' : 'この商品を削除') + '</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">キャンセル</button><button type="submit" class="btn-primary">保存する</button></div></form>');
  }

  function saveItem(f) {
    var fd = new FormData(f);
    var err = f.querySelector('#form-err');
    var name = String(fd.get('name') || '').trim().slice(0, 60);
    var urlRaw = String(fd.get('url') || '').trim();
    if (!name) { err.textContent = '商品名を入力してください'; return; }
    var url = '';
    if (urlRaw) {
      url = tidyUrl(urlRaw);
      if (!url) { err.textContent = 'リンクは https:// から始まるURLを入力してください'; return; }
    }
    var site = SITE_KEYS.indexOf(fd.get('site')) >= 0 ? fd.get('site') : 'other';
    var price = numOrNull(fd.get('price'));
    var gname = String(fd.get('gname') || '').trim().slice(0, 30);
    var groupId = String(fd.get('group') || '');
    var e = f.dataset.id ? getItem(f.dataset.id) : null;
    var v = e && f.dataset.vid ? getVariant(e, f.dataset.vid) : null;
    var group = !e && groupId ? getItem(groupId) : null;
    if ((group || (e && multi(e))) && !gname) { err.textContent = '品目名を入力してください（例：ミネラルウォーター）'; return; }
    var now = new Date().toISOString();
    var isNew = !e;
    if (isNew) {
      v = { id: uid(), name: name, url: url, site: site, image: form.photo || null, price: price, createdAt: now };
      if (group) {
        e = group;
        e.name = gname;
        e.variants.push(v);
      } else {
        e = { id: uid(), name: '', category: state.categories[0], must: true, cycle: 30, notifyBefore: 1, snoozeUntil: null, suggestOff: null, createdAt: now, variants: [v], history: [] };
        state.items.push(e);
      }
      var ld = fd.get('lastDate');
      if (isDate(ld)) { e.history.push({ id: uid(), date: ld, t: now, price: price, source: 'manual', variantId: v.id }); e.snoozeUntil = null; }
    } else {
      v.name = name; v.url = url; v.site = site;
      if (form.photo !== undefined) v.image = form.photo;
      var p = vPriced(e, v);
      if (p.length && price != null) p[0].price = price; else v.price = price;
      if (multi(e)) e.name = gname;
    }
    if (!group) {
      e.category = fd.get('category') || e.category;
      e.must = fd.get('must') !== '0';
      e.cycle = clampInt(fd.get('cycle'), 1, 365, e.cycle);
      e.notifyBefore = Math.min(clampInt(fd.get('notifyBefore'), 0, 30, 1), e.cycle);
    }
    var fromShare = form.fromShare;
    if (isNew && fromShare) state.lastShared = { itemId: e.id, variantId: v.id, at: Date.now() };
    persist();
    closeModal();
    toast(isNew ? '登録しました' : '保存しました');
    location.hash = '#item-' + e.id;
    render();
    if (isNew && fromShare && !v.image) showPhotoGuide(v);
  }
  function showPhotoGuide(v, already) {
    var ge = entryOfVariant(v.id);
    openModal('<div class="dialog guide"><div class="guide-icon">' + ICON.photo + '</div>' +
      '<h2>' + (already ? 'この商品は登録済みです。写真を付けましょう' : '続けて商品写真を共有してください') + '</h2>' +
      '<p class="muted">「' + esc(v.name) + '」に写真を付けます' + (already ? '。届いたのはリンクだけで、写真は入っていませんでした' : '') + '</p>' +
      '<div class="guide-ways"><div class="way main"><b>おすすめ：保存して選ぶ（確実）</b>' +
      '<ol class="howto"><li>Chromeで商品写真を<b>長押し</b>→「<b>画像をダウンロード</b>」</li><li>このアプリに戻り、下の「<b>写真を選ぶ</b>」を押す</li><li>ダウンロードした写真を選ぶ</li></ol>' +
      (ge ? pickBtn(ge, v, '写真を選ぶ', 'btn-primary') : '') + '</div>' +
      '<div class="way"><b>または：長押しして共有</b>' +
      '<ol class="howto"><li>商品写真を<b>長押し</b>→「<b>画像を共有</b>」</li><li>「<b>リピ買い</b>」を選ぶ</li></ol>' +
      '<small class="muted">Chromeの都合で、写真ではなくリンクだけが届くことがあります</small></div></div>' +
      '<div class="sheet-actions"><span class="sp"></span><button class="btn-ghost" data-action="closeModal">あとで付ける</button></div></div>');
  }
  function openHistForm(eid, hid) {
    var e = getItem(eid);
    if (!e) return;
    var h = hid ? e.history.find(function (x) { return x.id === hid; }) : null;
    var v = h ? (getVariant(e, h.variantId) || curVariant(e)) : curVariant(e);
    var price = h ? h.price : vLastPrice(e, v);
    var vsel = multi(e) ? '<label class="field"><span>銘柄</span><select id="h-variant" name="variant">' + e.variants.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (x.id === v.id ? ' selected' : '') + '>' + esc(x.name) + '（' + siteLabel(x) + '）</option>';
    }).join('') + '</select></label>' : '';
    openModal('<form class="dialog" id="hist-form" data-id="' + esc(e.id) + '" data-hid="' + (h ? esc(h.id) : '') + '">' +
      '<h2>' + (h ? '購入履歴を編集' : '購入を手動で追加') + '</h2><p class="muted">' + esc(entryLabel(e)) + '</p>' + vsel +
      '<label class="field"><span>購入日</span><input id="h-date" type="date" name="date" required max="' + C.todayStr() + '" value="' + (h ? h.date : C.todayStr()) + '"></label>' +
      '<label class="field"><span>価格（円・任意）</span><input id="h-price" type="number" name="price" min="0" inputmode="numeric" value="' + (price == null ? '' : price) + '"></label>' +
      '<div class="sheet-actions">' + (h ? '<button type="button" class="link-btn danger" data-action="deleteHist" data-id="' + esc(e.id) + '" data-hid="' + esc(h.id) + '">この記録を削除</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn-ghost" data-action="closeModal">キャンセル</button><button type="submit" class="btn-primary">保存する</button></div></form>');
  }
  function saveHist(f) {
    var e = getItem(f.dataset.id);
    if (!e) return;
    var fd = new FormData(f);
    var date = fd.get('date');
    if (!isDate(date)) return;
    var price = numOrNull(fd.get('price'));
    var vid = fd.get('variant');
    if (!getVariant(e, vid)) vid = curVariant(e).id;
    var hid = f.dataset.hid;
    if (hid) {
      var h = e.history.find(function (x) { return x.id === hid; });
      if (h) { h.date = date; h.price = price; h.variantId = vid; }
    } else {
      e.history.push({ id: uid(), date: date, t: new Date().toISOString(), price: price, source: 'manual', variantId: vid });
      e.snoozeUntil = null;
    }
    persist();
    closeModal();
    render();
    toast('購入履歴を保存しました');
  }

  /* ---------- 購入・確認 ---------- */
  function buy(eid, vid) {
    var e = getItem(eid);
    if (!e) return;
    var v = getVariant(e, vid) || curVariant(e);
    var mode = state.settings.confirmMode;
    if (mode === 'none') return;
    var h = { id: uid(), date: C.todayStr(), t: new Date().toISOString(), price: vLastPrice(e, v), source: 'app', variantId: v.id };
    e.history.push(h);
    e.snoozeUntil = null;
    delete state.notified[e.id];
    if (mode === 'ask') state.pending.push({ itemId: e.id, histId: h.id, at: Date.now() });
    persist();
    if (modalRoot.querySelector('.vlist')) closeModal();
    render();
    if (mode === 'auto') { toast('購入として記録しました（違ったら履歴から消せます）'); return; }
    var wentAway = false;
    function onHide() { if (document.visibilityState === 'hidden') wentAway = true; }
    document.addEventListener('visibilitychange', onHide);
    clearTimeout(buyWatch);
    buyWatch = setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      if (!wentAway && document.visibilityState === 'visible') showReturn();
    }, 2500);
  }
  /* 確認待ちを先頭から1つずつ聞く（確認漏れが出ないよう、答えるまで残す） */
  function showReturn() {
    if (!state.pending.length || modalRoot.querySelector('.ret') || modalRoot.querySelector('#item-form') || modalRoot.querySelector('.attach')) return;
    var p = state.pending[0];
    var e = getItem(p.itemId);
    var h = e && e.history.find(function (x) { return x.id === p.histId; });
    if (!e || !h) { state.pending.shift(); persist(); showReturn(); return; }
    var v = getVariant(e, h.variantId) || curVariant(e);
    var from = v.site === 'other' ? 'お店' : siteLabel(v);
    var n = state.pending.length;
    openModal('<div class="dialog ret" role="dialog" aria-label="購入の確認"><div class="ret-icon">' + ICON.cart + '</div>' +
      (n > 1 ? '<span class="ret-count">確認が ' + n + '件 あります</span>' : '') +
      '<span class="ret-from">' + esc(from) + 'から おかえりなさい</span>' +
      '<div class="ret-name">' + esc(v.name) + '</div><div class="ret-q">買えましたか？</div>' +
      '<div class="ret-price"><label for="ret-price">今回の価格</label><div class="yen"><span>¥</span><input id="ret-price" type="number" min="0" inputmode="numeric" value="' + (h.price == null ? '' : h.price) + '"></div><span class="muted">任意</span></div>' +
      (e.must ? '<div class="ret-next">' + ICON.bell + '<span>「はい」で次の買いどきは <b>' + fmtLong(C.addDays(h.date, e.cycle)) + '</b></span></div>' : '') +
      '<div class="ret-actions"><button class="btn-primary big" data-action="retYes">はい、買った</button><button class="btn-ghost big" data-action="retNo">いいえ、まだ</button></div>' +
      '<p class="ret-note">あとから購入履歴で直せます</p></div>');
  }
  function retAnswer(yes) {
    var p = state.pending.shift();
    if (p) {
      var e = getItem(p.itemId);
      if (e) {
        if (yes) {
          var h = e.history.find(function (x) { return x.id === p.histId; });
          var el = document.getElementById('ret-price');
          if (h && el) h.price = numOrNull(el.value);
        } else {
          e.history = e.history.filter(function (x) { return x.id !== p.histId; });
        }
      }
      persist();
    }
    closeModal();
    render();
    toast(yes ? '購入を記録しました' : '記録を取り消しました');
    if (state.pending.length) setTimeout(showReturn, 350);
  }
  function snooze(id) {
    var e = getItem(id);
    if (!e) return;
    var s = status(e), today = C.todayStr();
    var base = s.due > today ? s.due : today;
    e.snoozeUntil = C.addDays(base, 2);
    delete state.notified[e.id];
    persist();
    render();
    toast(fmtLong(e.snoozeUntil) + ' にまたお知らせします');
  }

  /* ---------- 共有で届いたもの ---------- */
  async function processInbox() {
    var box = await DB.getKV('inbox');
    if (location.hash === '#share') history.replaceState(null, '', location.pathname + location.search + '#home');
    if (!box) { render(); return; }
    await DB.setKV('inbox', null);
    /* うまくいかないときの確認用に、何が届いたかを残す（写真そのものは残さない） */
    ui.lastInbox = {
      at: Number(box.at) || Date.now(), title: String(box.title || '').slice(0, 120), text: String(box.text || '').slice(0, 200),
      url: String(box.url || '').slice(0, 200), image: box.image ? { type: String(box.image.type || ''), size: Number(box.image.size) || 0 } : null
    };
    DB.setKV('lastInbox', ui.lastInbox);
    if (Date.now() - (Number(box.at) || 0) > 24 * 3600 * 1000) { render(); return; }
    var urls = allUrls(box.url).concat(allUrls(box.text));
    var imgUrl = urls.find(isImageUrl) || '';
    var url = urls.find(function (u) { return !isImageUrl(u); }) || '';
    var site = detectSite(url) || 'other';
    var rawTitle = box.title || urls.reduce(function (t, u) { return t.replace(u, ''); }, String(box.text || '')).trim();
    var name = cleanTitle(rawTitle, site);
    var key = urlKey(url);
    var match = null;
    if (key) {
      state.items.some(function (e) {
        return e.variants.some(function (v) { if (urlKey(v.url) === key) { match = { e: e, v: v }; return true; } return false; });
      });
    }
    render();
    if (box.image || imgUrl) {
      if (box.image) {
        sharePhoto = await cropImage(box.image);
        if (!sharePhoto) { toast('写真の取り込みをやめました'); return; }
      } else {
        sharePhoto = okImage(imgUrl);
      }
      if (match) { confirmAttach(match.e, match.v); return; }
      if (url) {
        openItemForm({ fromShare: true, prefill: { name: name, url: tidyUrl(url) || '', site: site, image: sharePhoto } });
        sharePhoto = null;
        return;
      }
      var ls = state.lastShared;
      if (ls && Date.now() - ls.at < 30 * 60 * 1000) {
        var le = getItem(ls.itemId), lv = le && getVariant(le, ls.variantId);
        if (lv && !lv.image) { confirmAttach(le, lv); return; }
      }
      openAttachPick();
      return;
    }
    if (match) {
      location.hash = '#item-' + match.e.id;
      render();
      if (!match.v.image) {
        /* 登録済みで写真がない商品なら、このあと届く写真をこの商品に付ける */
        state.lastShared = { itemId: match.e.id, variantId: match.v.id, at: Date.now() };
        persist();
        showPhotoGuide(match.v, true);
      } else {
        toast('「' + match.v.name + '」はもう登録されています');
      }
      return;
    }
    if (!url && !name) { toast('共有された内容を読み取れませんでした'); return; }
    openItemForm({ fromShare: true, prefill: { name: name, url: tidyUrl(url) || '', site: site } });
  }
  function confirmAttach(e, v) {
    openModal('<div class="dialog attach"><h2>写真を付けますか？</h2><div class="attach-prev">' + imgTag(sharePhoto, '共有された写真') + '</div>' +
      '<p class="confirm-msg">この写真を「<b>' + esc(v.name) + '</b>」に付けます。' + (v.image ? '今の写真と入れ替わります。' : '') + '</p>' +
      '<div class="sheet-actions"><button type="button" class="link-btn" data-action="attachPick">ほかの商品を選ぶ</button><span class="sp"></span>' +
      '<button type="button" class="btn-ghost" data-action="attachCancel">やめる</button>' +
      '<button type="button" class="btn-primary" data-action="attachYes" data-id="' + esc(e.id) + '" data-vid="' + esc(v.id) + '">はい、付ける</button></div></div>');
  }
  function openAttachPick() {
    var list = [];
    state.items.forEach(function (e) { e.variants.forEach(function (v) { list.push({ e: e, v: v }); }); });
    if (!list.length) {
      openItemForm({ fromShare: true, prefill: { image: sharePhoto } });
      sharePhoto = null;
      return;
    }
    list.sort(function (a, b) {
      if (!a.v.image !== !b.v.image) return a.v.image ? 1 : -1;
      return String(b.v.createdAt).localeCompare(String(a.v.createdAt));
    });
    openModal('<div class="dialog attach"><h2>どの商品の写真にしますか？</h2><div class="attach-prev sm">' + imgTag(sharePhoto, '共有された写真') + '</div>' +
      '<div class="vlist pick-list">' + list.map(function (x) {
        return '<button type="button" class="vrow as-pick" data-action="attachYes" data-id="' + esc(x.e.id) + '" data-vid="' + esc(x.v.id) + '"><span class="thumb sm" style="background:' + tintOf(x.v.id) + '">' + thumbInner(x.v, x.e.category) + '</span>' +
          '<span class="g-name">' + esc(x.v.name) + '<small>' + siteLabel(x.v) + (x.v.image ? ' ・ 写真あり（入れ替え）' : ' ・ 写真なし') + '</small></span></button>';
      }).join('') + '</div>' +
      '<div class="sheet-actions"><button type="button" class="link-btn" data-action="attachNew">新しい商品として登録</button><span class="sp"></span><button type="button" class="btn-ghost" data-action="attachCancel">やめる</button></div></div>');
  }
  function attachTo(eid, vid) {
    var e = getItem(eid), v = e && getVariant(e, vid);
    if (!v || !sharePhoto) { closeModal(); return; }
    v.image = sharePhoto;
    sharePhoto = null;
    state.lastShared = null;
    persist();
    closeModal();
    location.hash = '#item-' + e.id;
    render();
    toast('写真を付けました');
  }

  /* ---------- 写真の調整（位置・大きさ・回転を決めて、正方形で保存） ---------- */
  var cropRoot = (function () {
    var el = document.getElementById('crop-root');
    if (!el) { el = document.createElement('div'); el.id = 'crop-root'; document.body.appendChild(el); }
    return el;
  })();
  var cropCancel = null;
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var isStr = typeof src === 'string';
      var url = isStr ? src : URL.createObjectURL(src);
      var img = new Image();
      img.onload = function () { if (!isStr) URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { if (!isStr) URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  async function cropImage(src) {
    var img;
    try { img = await loadImg(src); } catch (e) { toast('写真を読み込めませんでした'); return null; }
    var k = Math.min(1, 1600 / Math.max(img.width, img.height));
    var base = document.createElement('canvas');
    base.width = Math.max(1, Math.round(img.width * k));
    base.height = Math.max(1, Math.round(img.height * k));
    base.getContext('2d').drawImage(img, 0, 0, base.width, base.height);
    return new Promise(function (resolve) {
      cropRoot.innerHTML = '<div class="crop-backdrop"><div class="dialog crop" role="dialog" aria-label="写真の調整">' +
        '<h2>写真を調整</h2><p class="muted crop-help">指でずらして位置を、2本指か下のつまみで大きさを決めます</p>' +
        '<div class="crop-stage" id="crop-stage"><canvas id="crop-canvas" width="720" height="720"></canvas><div class="crop-frame"></div></div>' +
        '<div class="crop-tools"><button type="button" class="icon-btn round" id="crop-out" aria-label="小さくする">−</button>' +
        '<input type="range" id="crop-zoom" min="0" max="1000" value="0" aria-label="大きさ">' +
        '<button type="button" class="icon-btn round" id="crop-in" aria-label="大きくする">＋</button></div>' +
        '<div class="crop-tools"><button type="button" class="btn-ghost sm" id="crop-fit">全体を表示</button>' +
        '<button type="button" class="btn-ghost sm" id="crop-fill">枠いっぱい</button>' +
        '<button type="button" class="btn-ghost sm" id="crop-rot">回転</button></div>' +
        '<div class="sheet-actions"><span class="sp"></span><button type="button" class="btn-ghost" id="crop-cancel">やめる</button>' +
        '<button type="button" class="btn-primary" id="crop-ok">この範囲で決定</button></div></div></div>';
      var S = 720, cv = document.getElementById('crop-canvas'), ctx = cv.getContext('2d');
      var stage = document.getElementById('crop-stage'), zoom = document.getElementById('crop-zoom');
      var rot = 0, scale = 1, ox = 0, oy = 0;
      function dims() { return rot % 2 ? [base.height, base.width] : [base.width, base.height]; }
      function fitS() { var d = dims(); return S / Math.max(d[0], d[1]); }
      function fillS() { var d = dims(); return S / Math.min(d[0], d[1]); }
      function minS() { return fitS() * 0.6; }
      function maxS() { return fillS() * 4; }
      function syncZoom() { zoom.value = Math.round(Math.log(scale / minS()) / Math.log(maxS() / minS()) * 1000); }
      function clamp() {
        scale = Math.min(maxS(), Math.max(minS(), scale));
        var d = dims(), hw = d[0] * scale / 2 + S / 2 - 60, hh = d[1] * scale / 2 + S / 2 - 60;
        ox = Math.max(-hw, Math.min(hw, ox));
        oy = Math.max(-hh, Math.min(hh, oy));
      }
      function paint(c, size) {
        var f = size / S, g = c.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, size, size);
        g.translate(size / 2 + ox * f, size / 2 + oy * f);
        g.rotate(rot * Math.PI / 2);
        g.scale(scale * f, scale * f);
        g.imageSmoothingQuality = 'high';
        g.drawImage(base, -base.width / 2, -base.height / 2);
      }
      function draw() { clamp(); paint(cv, S); }
      function setScale(ns, keepSlider) { scale = ns; clamp(); if (!keepSlider) syncZoom(); draw(); }
      function reset(mode) { ox = 0; oy = 0; setScale(mode === 'fill' ? fillS() : fitS()); }
      reset('fit');

      var pts = {}, last = null, pinch = null;
      function ratio() { return S / stage.getBoundingClientRect().width; }
      stage.addEventListener('pointerdown', function (e) {
        stage.setPointerCapture(e.pointerId);
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
        }
        last = { x: e.clientX, y: e.clientY };
      });
      stage.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length >= 2 && pinch) {
          var a = pts[ids[0]], b = pts[ids[1]];
          setScale(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d));
        } else if (last) {
          var r = ratio();
          ox += (e.clientX - last.x) * r;
          oy += (e.clientY - last.y) * r;
          draw();
        }
        last = { x: e.clientX, y: e.clientY };
      });
      function up(e) {
        delete pts[e.pointerId];
        if (Object.keys(pts).length < 2) pinch = null;
        var rest = Object.keys(pts);
        last = rest.length ? { x: pts[rest[0]].x, y: pts[rest[0]].y } : null;
      }
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', function (e) { e.preventDefault(); setScale(scale * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
      zoom.addEventListener('input', function () { setScale(minS() * Math.pow(maxS() / minS(), zoom.value / 1000), true); });
      document.getElementById('crop-in').onclick = function () { setScale(scale * 1.15); };
      document.getElementById('crop-out').onclick = function () { setScale(scale / 1.15); };
      document.getElementById('crop-fit').onclick = function () { reset('fit'); };
      document.getElementById('crop-fill').onclick = function () { reset('fill'); };
      document.getElementById('crop-rot').onclick = function () { rot = (rot + 1) % 4; ox = 0; oy = 0; setScale(Math.min(Math.max(scale, fitS()), maxS())); };
      function finish(val) { cropRoot.innerHTML = ''; cropCancel = null; resolve(val); }
      cropCancel = function () { finish(null); };
      document.getElementById('crop-cancel').onclick = function () { finish(null); };
      document.getElementById('crop-ok').onclick = function () {
        var out = document.createElement('canvas');
        out.width = 480; out.height = 480;
        paint(out, 480);
        finish(out.toDataURL('image/jpeg', 0.85));
      };
    });
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
    function mk(o) {
      var vs = o.v.map(function (x) { return { id: uid(), name: x[0], site: x[1], url: x[2], image: null, price: null, createdAt: new Date().toISOString() }; });
      return {
        id: uid(), name: o.name || '', category: o.cat, must: o.must !== false, cycle: o.cycle, notifyBefore: 1,
        snoozeUntil: null, suggestOff: null, createdAt: new Date().toISOString(), variants: vs,
        history: o.h.map(function (x) { return { id: uid(), date: C.addDays(t, -x[0]), t: '', price: x[2], source: 'app', variantId: vs[x[1]].id }; })
      };
    }
    state.items.push(
      mk({ name: 'ミネラルウォーター', cat: '飲料', cycle: 4, v: [['い・ろ・は・す 540ml×24本', 'amazon', 'https://www.amazon.co.jp/'], ['南アルプスの天然水 2L×6本', 'yodobashi', 'https://www.yodobashi.com/']],
        h: [[5, 1, 698], [10, 0, 1980], [15, 1, 698], [21, 0, 1980], [26, 1, 678]] }),
      mk({ cat: '紙類', cycle: 28, v: [['トイレットペーパー 12ロール', 'amazon', 'https://www.amazon.co.jp/']], h: [[29, 0, 1078], [57, 0, 1078]] }),
      mk({ cat: '洗剤・掃除', cycle: 30, v: [['食器用洗剤 詰め替え', 'rakuten', 'https://www.rakuten.co.jp/']], h: [[28, 0, 498], [58, 0, 498]] }),
      mk({ cat: '飲料', cycle: 14, v: [['炭酸水 500ml×24本', 'amazon', 'https://www.amazon.co.jp/']], h: [[11, 0, 1580], [25, 0, 1580], [39, 0, 1480]] }),
      mk({ cat: '洗剤・掃除', cycle: 29, v: [['洗濯用洗剤 詰め替え', 'yodobashi', 'https://www.yodobashi.com/']], h: [[20, 0, 658]] }),
      mk({ cat: '紙類', cycle: 44, v: [['ティッシュ 5箱', 'amazon', 'https://www.amazon.co.jp/']], h: [[30, 0, 548]] }),
      mk({ cat: '洗剤・掃除', cycle: 10, v: [['柔軟剤 詰め替え', 'rakuten', 'https://www.rakuten.co.jp/']], h: [[35, 0, 598]] }),
      mk({ cat: '衛生用品', cycle: 90, must: false, v: [['歯ブラシ 4本', 'rakuten', 'https://www.rakuten.co.jp/']], h: [[48, 0, 398]] })
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
        var sc = Math.min(1, 480 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc));
        c.height = Math.max(1, Math.round(img.height * sc));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }

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

  /* ---------- イベント ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.classList && t.classList.contains('modal-backdrop')) {
      if (modalRoot.querySelector('.ret')) return; /* 購入確認は答えるまで閉じない */
      if (modalRoot.querySelector('.attach')) sharePhoto = null;
      closeModal();
      return;
    }
    if (t.classList && t.classList.contains('drawer-backdrop')) { ui.drawer = false; render(); return; }
    var el = t.closest && t.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action, id = el.dataset.id, e;
    switch (a) {
      case 'drawer': ui.drawer = true; render(); break;
      case 'closeDrawer': ui.drawer = false; setTimeout(render, 0); break;
      case 'add': ui.drawer = false; render(); openItemForm({}); break;
      case 'addBrand': openItemForm({ groupId: id }); break;
      case 'edit': openItemForm({ id: id, vid: el.dataset.vid }); break;
      case 'brands': openBrands(id); break;
      case 'buy':
        if (el.dataset.nolink) { ev.preventDefault(); toast('商品ページのリンクが未登録です'); openItemForm({ id: id, vid: el.dataset.vid }); }
        else buy(id, el.dataset.vid);
        break;
      case 'snooze': snooze(id); break;
      case 'site': ui.site = el.dataset.site; render(); break;
      case 'catPick': openCatPick(); break;
      case 'setCat': ui.cat = el.dataset.cat === '__all' ? null : el.dataset.cat; closeModal(); render(); break;
      case 'setMust': e = getItem(id); if (e) { e.must = el.dataset.v === '1'; persist(); render(); } break;
      case 'cycle': e = getItem(id); if (e) { e.cycle = clampInt(e.cycle + Number(el.dataset.d), 1, 365, e.cycle); if (e.notifyBefore > e.cycle) e.notifyBefore = e.cycle; persist(); render(); } break;
      case 'setCycle': e = getItem(id); if (e) { e.cycle = clampInt(el.dataset.v, 1, 365, e.cycle); if (e.notifyBefore > e.cycle) e.notifyBefore = e.cycle; persist(); render(); toast(e.cycle + '日ごとにしました'); } break;
      case 'formCycle': {
        var ci = document.getElementById('f-cycle');
        if (ci) ci.value = el.dataset.v;
        el.parentNode.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === el); });
        break;
      }
      case 'notify': e = getItem(id); if (e) { e.notifyBefore = clampInt(e.notifyBefore + Number(el.dataset.d), 0, Math.min(30, e.cycle), e.notifyBefore); persist(); render(); } break;
      case 'applyAvg': e = getItem(id); if (e) { var sg = suggestion(e) || { to: Math.max(1, Math.round(avgInterval(e) || e.cycle)) }; e.cycle = sg.to; e.suggestOff = null; persist(); render(); toast(e.cycle + '日ごとに変更しました'); } break;
      case 'dismissSuggest': e = getItem(id); if (e) { e.suggestOff = e.history.length; persist(); render(); toast('次に買うまで提案しません'); } break;
      case 'addHist': openHistForm(id, null); break;
      case 'editHist': openHistForm(id, el.dataset.hid); break;
      case 'deleteHist':
        e = getItem(id);
        if (e) {
          var hid = el.dataset.hid;
          askConfirm('この購入記録を削除します。', '削除する', function () {
            e.history = e.history.filter(function (x) { return x.id !== hid; });
            persist(); render(); toast('削除しました');
          });
        }
        break;
      case 'deleteItem':
        e = getItem(id);
        if (e) {
          var dv = getVariant(e, el.dataset.vid);
          if (multi(e) && dv) {
            askConfirm('銘柄「' + dv.name + '」を削除します。この銘柄の購入履歴は、品目の履歴として残ります。', '削除する', function () {
              e.variants = e.variants.filter(function (x) { return x.id !== dv.id; });
              e.history.forEach(function (h) { if (h.variantId === dv.id) h.variantId = curVariant(e).id; });
              if (e.variants.length === 1) e.name = '';
              persist(); render(); toast('削除しました');
            });
          } else {
            askConfirm('「' + entryLabel(e) + '」を削除します。購入履歴も消えます。', '削除する', function () {
              state.items = state.items.filter(function (x) { return x.id !== id; });
              state.pending = state.pending.filter(function (p) { return p.itemId !== id; });
              persist(); location.hash = '#home'; render(); toast('削除しました');
            });
          }
        }
        break;
      case 'clearPhoto': {
        form.photo = null;
        var f = document.getElementById('item-form');
        var prev = document.getElementById('photo-prev');
        if (prev && f) prev.innerHTML = IL[kindOf(f.elements.category ? f.elements.category.value : '')];
        el.remove();
        break;
      }
      case 'closeModal': closeModal(); if (state.pending.length) setTimeout(showReturn, 200); break;
      case 'confirmOk': { var fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn(); break; }
      case 'retYes': retAnswer(true); break;
      case 'retNo': retAnswer(false); break;
      case 'attachYes': attachTo(id, el.dataset.vid); break;
      case 'attachPick': openAttachPick(); break;
      case 'attachNew': openItemForm({ fromShare: true, prefill: { image: sharePhoto } }); sharePhoto = null; break;
      case 'attachCancel': sharePhoto = null; closeModal(); break;
      case 'recrop': {
        var re = getItem(id), rv = re && getVariant(re, el.dataset.vid);
        if (rv && rv.image) cropImage(rv.image).then(function (d) { if (d) { rv.image = d; persist(); render(); toast('写真を調整しました'); } });
        break;
      }
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
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'q') {
      ui.q = t.value;
      var b = document.getElementById('home-body');
      if (b) b.innerHTML = homeBody();
    } else if (t.id === 'f-url') {
      var s = detectSite(t.value.trim());
      if (s) { var r = t.form.querySelector('input[name=site][value=' + s + ']'); if (r) r.checked = true; }
    } else if (t.id === 'f-cycle') {
      t.form.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c.dataset.v === t.value); });
    }
  });
  document.addEventListener('change', async function (ev) {
    var t = ev.target;
    if (t.classList.contains('pick-photo') && t.files && t.files[0]) {
      var pe = getItem(t.dataset.id), pv = pe && getVariant(pe, t.dataset.vid);
      if (!pv) return;
      var pf = t.files[0];
      t.value = '';
      var pdata = await cropImage(pf);
      if (!pdata) return;
      pv.image = pdata;
      if (state.lastShared && state.lastShared.variantId === pv.id) state.lastShared = null;
      persist(); closeModal(); location.hash = '#item-' + pe.id; render(); toast('写真を付けました');
    } else if (t.id === 'form-photo-file' && t.files && t.files[0]) {
      var ff = t.files[0];
      t.value = '';
      var fdata = await cropImage(ff);
      if (fdata) {
        form.photo = fdata;
        document.getElementById('photo-prev').innerHTML = imgTag(form.photo);
      }
    } else if (t.id === 'import-file' && t.files && t.files[0]) {
      await importData(t.files[0]);
      t.value = '';
    } else if (t.id === 'qs' || t.id === 'qe') {
      state.settings[t.id === 'qs' ? 'quietStart' : 'quietEnd'] = parseInt(t.value, 10);
      persist(); render(); toast('保存しました');
    } else if (t.id === 'd-cycle') {
      var ce = getItem(t.dataset.id);
      if (ce) {
        var nv = clampInt(t.value, 1, 365, ce.cycle);
        if (nv !== ce.cycle) {
          ce.cycle = nv;
          if (ce.notifyBefore > ce.cycle) ce.notifyBefore = ce.cycle;
          persist(); toast(ce.cycle + '日ごとにしました');
        }
        render();
      }
    } else if (t.name === 'confirmMode') {
      state.settings.confirmMode = CONFIRM_MODES.indexOf(t.value) >= 0 ? t.value : 'ask';
      persist(); toast('保存しました');
    } else if (t.id === 'f-group') {
      var g = getItem(t.value);
      var fm = t.form;
      fm.querySelector('.entry-fields').hidden = !!g;
      fm.querySelector('.gname-field').hidden = !g;
      if (g) fm.querySelector('#f-gname').value = g.name || '';
    } else if (t.id === 'f-cat') {
      var hasPhoto = !!form.photo || (form.photo === undefined && document.querySelector('#photo-prev img'));
      if (!hasPhoto) document.getElementById('photo-prev').innerHTML = IL[kindOf(t.value)];
    }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target;
    if (f.id === 'item-form') { ev.preventDefault(); saveItem(f); }
    else if (f.id === 'hist-form') { ev.preventDefault(); saveHist(f); }
    else if (f.id === 'cat-form') { ev.preventDefault(); addCat(new FormData(f).get('cat')); }
    else if (f.id === 'rename-form') { ev.preventDefault(); renameCatTo(f.dataset.cat, new FormData(f).get('cat')); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && cropCancel) { cropCancel(); return; }
    if (ev.key === 'Escape') {
      if (modalRoot.querySelector('.ret')) return;
      if (modalRoot.innerHTML) { sharePhoto = null; closeModal(); }
      else if (ui.drawer) { ui.drawer = false; render(); }
    }
  });
  window.addEventListener('hashchange', function () {
    if (location.hash === '#share') { processInbox(); return; }
    ui.drawer = false; render(); window.scrollTo(0, 0);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !state) return;
    if (location.hash === '#share') { processInbox(); return; }
    if (!modalRoot.innerHTML) render();
    showReturn();
    checkUpdate(false);
  });
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); deferredInstall = ev; if (state && !modalRoot.innerHTML) render(); });

  /* ---------- 起動 ---------- */
  async function init() {
    var s = null;
    try { s = await DB.load(); } catch (e) { s = null; }
    try { state = s ? normalizeLoaded(s) : defaultState(); } catch (e) { state = defaultState(); }
    try { ui.lastInbox = await DB.getKV('lastInbox'); } catch (e) { ui.lastInbox = null; }
    if (s && s.version !== 2) persist(); /* 旧い形のデータを新しい形で保存し直す */
    if (location.hash === '#share') await processInbox(); else render();
    showReturn();
    checkUpdate(true);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 無視 */ }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function () {
        if (state.settings.notifyEnabled) return registerSync().then(function () { if (route().name === 'settings' && !modalRoot.innerHTML) render(); });
      }).catch(function () { syncStatus = 'unsupported'; });
    } else { syncStatus = 'unsupported'; }
  }
  init();
})();
