/* ================= 統計処理 ==================== */
let userNameCache = {};
let userNameCacheLoaded = false;

/* ユーザーID→名前のマッピングをストレージから読み込む */
const loadUserNameCache = (projectName) => {
    if (userNameCacheLoaded) return Promise.resolve(userNameCache);
    return new Promise(resolve => {
        chrome.storage.local.get(
            { [userMapKey(projectName)]: {} },
            data => {
                userNameCache = data[userMapKey(projectName)] || {};
                userNameCacheLoaded = true;
                resolve(userNameCache);
            }
        );
    });
};

/* ユーザーID→名前のマッピングをキャッシュとストレージに保存する */
const saveUserNameToCache = (projectName, uid, name) => {
    if (!uid || !name) return;
    if (userNameCache[uid] === name) return;
    userNameCache[uid] = name;
    chrome.storage.local.set({ [userMapKey(projectName)]: userNameCache });
};

/* 直近のbuildTalkStats結果（著者推定のフォールバックに使う） */
let _lastTalkStats = {};

/* 行データからユーザーごとの発言量統計を集計する */
const buildTalkStats = (rawLines) => {
    const stats = {};
    const idToName = { ...userNameCache };
    const lines = normalizeLines(rawLines, { withUid: true });

    lines.forEach(line => {
        const { text, uid } = line;
        if (!uid || uid === 'unknown') return;

        const name = extractIconName(text);
        if (name) {
            idToName[uid] = name;
            saveUserNameToCache(currentProjectName, uid, name);
        }
        if (text && !text.startsWith('[')) {
            stats[uid] = (stats[uid] || 0) + text.length;
        }
    });
    _lastTalkStats = stats;
    return { stats, idToName };
};

/* 指定uidがページ内で十分な文字数を書いているか判定する */
const isLikelyAuthor = (uid) => {
    if (!uid || !_lastTalkStats[uid]) return false;
    const total = Object.values(_lastTalkStats).reduce((a, b) => a + b, 0);
    if (total === 0) return false;
    /* ページ全体の2%以上書いていれば本人と見なす */
    return _lastTalkStats[uid] / total >= 0.02;
};

/* 発言量統計をバーチャートとして描画する */
const renderTalkStats = (parentNode, stats, idToName) => {
    const entries = Object.entries(stats);
    if (!entries.length) return;

    appendSectionHeader(parentNode, '📊 発言数');
    const max = Math.max(...entries.map(([, v]) => v), 1);

    entries.sort((a, b) => b[1] - a[1]).forEach(([uid, count]) => {
        const name = idToName[uid] || uid;

        const row = document.createElement('div');
        row.className = 'sb-stats-row';

        const label = document.createElement('div');
        label.textContent = name;
        label.className = 'sb-stats-label';

        const right = document.createElement('div');
        right.className = 'sb-stats-right';

        const barWrap = document.createElement('div');
        barWrap.className = 'sb-stats-bar-wrap';

        const bar = document.createElement('div');
        bar.className = 'sb-stats-bar';
        bar.style.width = `${(count / max) * 100}%`;
        barWrap.appendChild(bar);

        const value = document.createElement('div');
        value.textContent = count;
        value.className = 'sb-stats-value';

        right.append(barWrap, value);
        row.append(label, right);
        parentNode.appendChild(row);
    });
};

