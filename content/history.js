/* ================= 履歴管理 ================= */
/* 履歴エントリ: { pageName, ts, id }
   - id は Scrapbox のページID。改名（タイトル行の編集）しても変わらないので、同じidの古い名前を最新名に寄せる。
   - 旧版の記録には id が無い。セッション中に一度だけページを引き直して id を付け、存在しないものは捨てる。 */

/* 正規化済みの閲覧履歴をストレージから読み込む */
const loadHistory = async (projectName) => {
    await retireSyncOnce(projectName);
    return loadFromStorage(chrome.storage.local, historyKey(projectName), [], normalizeHistoryEntries);
};

/* 閲覧履歴の登録は HISTORY_COMMIT_DELAY 経過後にコミット。
   タイトル入力中の中途URL（け→けん→けんき…）等の素早いURL変化はキャンセルされる。 */
let _historyTimer = null;

/* 登録待ちの履歴を取り消す（5秒たたずに別の画面へ移った時） */
const cancelPendingHistory = () => {
    if (_historyTimer) { clearTimeout(_historyTimer); _historyTimer = null; }
};

const saveHistory = (projectName, pageName) => {
    cancelPendingHistory();
    if (!projectName || !pageName) return;
    _historyTimer = setTimeout(() => {
        _historyTimer = null;
        _commitHistory(projectName, pageName).catch(e => console.warn('[SB Helper] history:', e));
    }, HISTORY_COMMIT_DELAY);
};

/* Scrapboxのタイトルを URL 上の表記（空白→_）にそろえる */
const _toUrlPageName = (title) => title.replace(/ /g, '_');

/* ページを引いて { id, pageName } を返す。存在しないページは null、通信失敗は undefined。
   Scrapbox は どこからもリンクされていない名前には 404、リンクだけある空ページには
   200 + persistent:false（id は毎回変わる仮のもの）を返すので、どちらも「存在しない」とみなす */
const _resolveHistoryPage = async (projectName, pageName) => {
    try {
        const r = await fetch(
            `https://scrapbox.io/api/pages/${projectName}/${encodeURIComponent(pageName)}?_=${Date.now()}`,
            { cache: 'no-store' }
        );
        if (r.status === 404) return null;
        if (!r.ok) return undefined;
        const json = await r.json();
        if (!json.persistent || !json.id) return null;
        return { id: json.id, pageName: _toUrlPageName(json.title || pageName) };
    } catch {
        return undefined;
    }
};

/* id の無い旧記録を引き直して整理する（プロジェクトごとにセッション中1回） */
const _historyCleaned = new Set();

const _cleanLegacyHistory = async (projectName, list) => {
    if (_historyCleaned.has(projectName)) return list;
    const names = [...new Set(list.filter(e => !e.id).map(e => e.pageName))];
    if (!names.length) { _historyCleaned.add(projectName); return list; }

    const resolved = {};
    let failed = false;
    const queue = [...names];
    const worker = async () => {
        while (queue.length) {
            const name = queue.shift();
            resolved[name] = await _resolveHistoryPage(projectName, name);
            if (resolved[name] === undefined) failed = true;
        }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (!failed) _historyCleaned.add(projectName);

    return list.flatMap(e => {
        if (e.id) return [e];
        const r = resolved[e.pageName];
        if (r === null) return [];                 /* もう存在しない名前 → 捨てる */
        if (r === undefined) return [e];           /* 通信失敗 → 次回に回す */
        return [{ ...e, id: r.id, pageName: r.pageName }];
    });
};

/* 同じidの記録はすべて最新の名前にそろえる（改名・タイトル編集の途中名を寄せる） */
const _applyLatestNames = (list) => {
    const latest = {};
    list.forEach(e => { if (e.id) latest[e.id] = e.pageName; });
    return list.map(e => (e.id && latest[e.id] !== e.pageName) ? { ...e, pageName: latest[e.id] } : e);
};

/* 履歴を書き込む（新しい HISTORY_LIMIT 件） */
const _writeHistory = async (key, list) => {
    try {
        await chrome.storage.local.set({ [key]: list.slice(-HISTORY_LIMIT) });
    } catch (e) {
        console.warn('[SB Helper] 履歴を保存できませんでした:', e);
    }
};

const _commitHistory = async (projectName, pageName) => {
    const page = await _resolveHistoryPage(projectName, pageName);
    if (!page) return;  /* 存在しないページ（作りかけ・改名で消えた名前）や通信失敗は記録しない */

    const key = historyKey(projectName);
    let list = await loadHistory(projectName);
    list = await _cleanLegacyHistory(projectName, list);

    const last = list[list.length - 1];
    if (!(last && last.id === page.id)) list.push({ pageName: page.pageName, ts: Date.now(), id: page.id });
    else last.pageName = page.pageName;

    await _writeHistory(key, _applyLatestNames(list));
};

/* 履歴エントリを正規化・フィルタリングする */
const normalizeHistoryEntries = (history) => {
    if (!Array.isArray(history)) return [];
    return history
        .filter(entry => entry && typeof entry.pageName === 'string' && entry.pageName.trim() !== '')
        .map(entry => ({
            pageName: entry.pageName,
            ts: typeof entry.ts === 'number' ? entry.ts : 0,
            ...(typeof entry.id === 'string' ? { id: entry.id } : {}),
        }));
};

/* 重複を除いた最近のページ一覧を返す */
const getRecentPages = (history, limit = RECENT_PAGES_LIMIT) => {
    const seen = new Set();
    const result = [];
    for (let i = history.length - 1; i >= 0; i--) {
        const pageName = history[i].pageName;
        if (seen.has(pageName)) continue;
        seen.add(pageName);
        result.push(history[i]);
        if (result.length >= limit) break;
    }
    return result;
};

/* 最近見たページ一覧をパネルに描画する（設定の表示数を参照、0なら非表示） */
const renderHistory = async (panelNode, history) => {
    const settings = await loadSettings(currentProjectName);
    const limit = settings.recentPagesCount ?? RECENT_PAGES_LIMIT;
    if (limit <= 0) return;

    const items = getRecentPages(history, limit);
    if (!items.length) return;

    appendSectionHeader(panelNode, '🕒 最近見たページ');
    items.forEach(item => {
        appendItem(panelNode, '・' + item.pageName,
            () => navigateToPage(item.pageName));
    });
};

/* よく見ているページ一覧をパネルに描画する（設定の表示数を参照、0なら非表示） */
const renderFrequentPages = async (panelNode, history) => {
    const settings = await loadSettings(currentProjectName);
    const limit = settings.frequentPagesCount ?? FREQUENT_PAGES_LIMIT;
    if (limit <= 0) return;

    const freq = {};
    history.forEach(item => { freq[item.pageName] = (freq[item.pageName] || 0) + 1; });

    const items = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (!items.length) return;

    appendSectionHeader(panelNode, '⭐ よく見ているページ');
    items.forEach(([pageName, count]) => {
        appendItem(panelNode, '・' + `${pageName} (${count})`,
            () => navigateToPage(pageName));
    });
};
