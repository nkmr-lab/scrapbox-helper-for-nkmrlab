/* ================= LabPay 連携 ================= */
/* 残高・連続来室 / 今ラボにいる人 / 共有タイマー / 学会締め切り を、メニューとトップのパネルに出す。
   通信は background.js が中継する（CORS の都合で content script からは pay.nkmr.io を直接呼べない）。
   認証は LabPay のログインクッキーそのまま（このブラウザで LabPay にログインしていれば見える）。
   拡張は一般公開しているので pay.nkmr.io への権限は任意（optional）。未許可なら「有効にする」の案内だけを出し、
   中村研のメンバーが許可ページで許可した時だけ動く。 */

const LABPAY_BASE = 'https://pay.nkmr.io';
const LABPAY_CACHE_MS = 60 * 1000;   /* メニューは遷移ごとに作り直すので、取得結果は1分使い回す */
const LABPAY_TIMER_COUNT = 3;
const LABPAY_DEADLINE_FETCH = 20;    /* 「自分の締め切りだけ」の時は多めに取ってから絞る（API側に絞り込みが無い） */

/* LabPay を表示すべきか（auto = nkmr-lab プロジェクトのみ） */
const shouldShowLabPay = (settings) => {
    const v = settings.showLabPay || 'auto';
    if (v === 'show') return true;
    if (v === 'hide') return false;
    return isNkmrLabProject();
};

/* background 経由で LabPay の GET API を呼ぶ。返り値 {ok, status, json, error} */
const labpayGet = async (path) => {
    try {
        const res = await chrome.runtime.sendMessage({ type: 'labpay:get', path });
        return res || { ok: false, status: 0, error: '応答なし' };
    } catch (e) {
        /* 拡張を再読み込みした直後の古いタブでは runtime が切れている */
        return { ok: false, status: 0, error: String(e.message || e) };
    }
};

let _labpayCache = null;   /* { at, promise } */

/* 設定で出すことになっている API だけをまとめて取得する（/api/me はログイン判定にも使うので常に取る）。
   返り値 { state: 'ok'|'login'|'disabled'|'error', me, rooms, timers, serverNow, deadlines, fetchedAt, error } */
const loadLabPaySnapshot = (settings) => {
    if (_labpayCache && Date.now() - _labpayCache.at < LABPAY_CACHE_MS) return _labpayCache.promise;

    const skip = Promise.resolve({ ok: false, status: 0, error: 'skipped' });
    const deadlineLimit = settings.labpayDeadlinesMineOnly ? LABPAY_DEADLINE_FETCH : (settings.labpayDeadlineCount || 3);
    const promise = (async () => {
        const [me, presence, timers, deadlines] = await Promise.all([
            labpayGet('/api/me'),
            settings.labpayShowPresence ? labpayGet('/api/presence') : skip,
            settings.labpayShowTimers ? labpayGet('/api/timers') : skip,
            settings.labpayShowDeadlines ? labpayGet(`/api/conf-deadlines/upcoming?limit=${deadlineLimit}`) : skip,
        ]);
        const fetchedAt = Date.now();
        if (me.error === 'no_permission') return { state: 'disabled', fetchedAt };
        if (me.status === 401) return { state: 'login', fetchedAt };
        if (!me.ok) {
            return { state: 'error', fetchedAt, error: me.status ? `HTTP ${me.status}` : (me.error || '通信できません') };
        }
        return {
            state: 'ok',
            fetchedAt,
            me: me.json,
            rooms: presence.ok ? (presence.json?.rooms || []) : null,
            timers: timers.ok ? (timers.json?.items || []) : null,
            serverNow: timers.ok ? timers.json?.server_now : null,
            deadlines: deadlines.ok ? (deadlines.json?.items || []) : null,
        };
    })();

    _labpayCache = { at: Date.now(), promise };
    /* 失敗は使い回さない（次に開いた時に取り直す） */
    promise.then(s => { if (s.state !== 'ok') _labpayCache = null; });
    return promise;
};

/* LabPay の画面を新しいタブで開く */
const openLabPay = (hash = '') => window.open(LABPAY_BASE + '/' + hash, '_blank', 'noopener');

/* 'YYYY-MM-DD HH:MM:SS'（LabPay サーバの現地時刻）を比較用のミリ秒にする。差を取るだけなのでタイムゾーンは問わない */
const _labpayTime = (s) => Date.parse(String(s || '').replace(' ', 'T'));

/* 秒数を「あと3日」「あと5時間」「あと20分」に */
const _labpayAhead = (sec) => {
    if (sec >= 86400) return `あと${Math.floor(sec / 86400)}日`;
    if (sec >= 3600) return `あと${Math.floor(sec / 3600)}時間`;
    return `あと${Math.max(1, Math.floor(sec / 60))}分`;
};

/* タイマーの残り秒（表示時点）。running は ends_at - server_now から取得後の経過を引く */
const _labpayTimerRemaining = (t, snap) => {
    if (t.status === 'paused') return Number(t.remaining_seconds || 0);
    const base = (_labpayTime(t.ends_at) - _labpayTime(snap.serverNow)) / 1000;
    return base - (Date.now() - snap.fetchedAt) / 1000;
};

/* LabPay 欄を parentNode に追加する。中身は非同期で埋まる（メニュー自体の表示は待たせない） */
const appendLabPaySection = (parentNode) => {
    const box = document.createElement('div');
    box.className = 'sb-labpay';
    appendSectionHeader(box, '💰 LabPay', () => openLabPay());
    const body = document.createElement('div');
    body.className = 'sb-labpay-body';
    appendItemMuted(body, '読み込み中…');
    box.appendChild(body);
    parentNode.appendChild(box);

    _fillLabPayBody(body);
    return box;
};

const _fillLabPayBody = async (body) => {
    const settings = await loadSettings(currentProjectName);
    const snap = await loadLabPaySnapshot(settings);
    body.replaceChildren();
    _renderLabPayBody(body, snap, settings);
};

/* 許可・取り消しの知らせ（background から）で、表示中の LabPay 欄をその場で描き直す */
chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== 'labpay:changed') return;
    _labpayCache = null;
    document.querySelectorAll('.sb-labpay-body').forEach(_fillLabPayBody);
});

const _renderLabPayBody = (body, snap, settings) => {
    if (snap.state === 'disabled') {
        appendItem(body, '🔗 LabPay連携を有効にする（中村研メンバー向け）',
            () => chrome.runtime.sendMessage({ type: 'labpay:enable' }).catch(() => {}));
        return;
    }
    if (snap.state === 'login') {
        appendItem(body, '🔑 LabPay にログインすると残高などが出ます', () => openLabPay());
        return;
    }
    if (snap.state === 'error') {
        appendItemMuted(body, `⚠ LabPay から読み込めませんでした（${snap.error}）`);
        return;
    }

    /* 残高・連続来室 */
    if (settings.labpayShowPoints) {
        const balance = Number(snap.me?.balance ?? 0).toLocaleString();
        const streak = snap.me?.streak?.current_streak;
        appendItem(body, `残高 ${balance}pt` + (streak ? `　🔥 ${streak}日連続` : ''), () => openLabPay());
    }

    /* 今ラボにいる人（LabPay の部屋一覧のまま、人がいる部屋ごと） */
    if (snap.rooms) {
        const occupied = snap.rooms.filter(r => r.users?.length);
        if (!occupied.length) {
            appendItemMuted(body, '🏠 今ラボにいる人はいません');
        } else {
            occupied.forEach(r => {
                const names = r.users.map(u => u.display_name).join('・');
                const row = appendItem(body, `🏠 ${r.display_name}（${r.users.length}人）：${names}`, () => openLabPay());
                row.title = r.users.map(u => `${u.display_name}：${String(u.session_start_at || '').slice(11, 16)}から`).join('\n');
            });
        }
    }

    /* 共有タイマー（動いている / 止めているものだけ） */
    if (snap.timers) {
        snap.timers
            .filter(t => t.status === 'running' || t.status === 'paused')
            .slice(0, LABPAY_TIMER_COUNT)
            .forEach(t => {
                const row = appendItem(body, '', () => openLabPay(`#/timers/${t.id}`));
                row.classList.add('sb-labpay-timer');
                row.dataset.timerId = String(t.id);
                const paint = () => {
                    const sec = _labpayTimerRemaining(t, snap);
                    const mark = t.status === 'paused' ? '⏸' : '⏱';
                    const time = sec > 0 ? formatTimerMMSS(sec) : '終了';
                    row.textContent = `${mark} ${t.title}　${time}` + (t.status === 'paused' ? '（停止中）' : '');
                };
                paint();
                if (t.status === 'running') {
                    const iv = setInterval(() => { if (!row.isConnected) clearInterval(iv); else paint(); }, 1000);
                }
            });
    }

    /* 学会締め切り（近い順。既定は自分が⭐参加しているものだけ） */
    if (snap.deadlines) {
        const list = snap.deadlines
            .filter(d => !settings.labpayDeadlinesMineOnly || Number(d.is_mine))
            .slice(0, settings.labpayDeadlineCount || 3);
        if (!list.length) {
            appendItemMuted(body, settings.labpayDeadlinesMineOnly
                ? '📅 自分が⭐参加している学会の締め切りはありません' : '📅 近い締め切りはありません');
        }
        list.forEach(d => {
            const sec = Number(d.sec_ahead || 0) - (Date.now() - snap.fetchedAt) / 1000;
            const at = String(d.nearest_at || '');
            const md = at.length >= 10 ? `${+at.slice(5, 7)}/${+at.slice(8, 10)}` : '';
            const label = d.nearest_label ? `（${d.nearest_label}）` : '';
            const aoe = Number(d.nearest_is_aoe) ? ' AoE' : '';
            const star = Number(d.is_mine) ? '⭐' : '📅';
            appendItem(body, `${star} ${_labpayAhead(sec)} ${d.name}${label} ${md}${aoe}`,
                () => openLabPay(`#/conf-deadlines/${d.id}`));
        });
    }
};
