/* ================= 統計処理 ==================== */

/*
 * userNameCache の構造（ページ数ベース投票方式）:
 *   { uid: { "名前A": 5, "名前B": 1 }, ... }
 * 最も多くのページで使われた名前を正式名とする。
 * 1ページで1回の誤認識では覆らない。
 */
let userNameCache = {};
let userNameCacheLoaded = false;

/* ユーザーID→名前マッピング（投票式）をストレージから読み込む（sync設定に従う） */
const loadUserNameCache = async (projectName) => {
    if (userNameCacheLoaded) return userNameCache;
    const settings = await loadSettings(projectName);
    const storage = getStorage(settings.syncUserMap);
    return new Promise(resolve => {
        storage.get(
            { [userMapKey(projectName)]: {} },
            data => {
                userNameCache = data[userMapKey(projectName)] || {};
                userNameCacheLoaded = true;
                resolve(userNameCache);
            }
        );
    });
};

/* 現在のページでの uid→name 投票を記録する（ページ単位で1票） */
const _votedThisPage = new Set();

const resetPageVotes = () => _votedThisPage.clear();

const voteUserName = async (projectName, uid, name) => {
    if (!uid || !name) return;

    /* 同一ページで同じuid+nameの組み合わせは1票だけ */
    const voteKey = `${uid}:${name}`;
    if (_votedThisPage.has(voteKey)) return;
    _votedThisPage.add(voteKey);

    if (!userNameCache[uid]) userNameCache[uid] = {};
    userNameCache[uid][name] = (userNameCache[uid][name] || 0) + 1;

    const settings = await loadSettings(projectName);
    getStorage(settings.syncUserMap).set({ [userMapKey(projectName)]: userNameCache });
};

/* uidに対して最も投票数の多い名前を返す */
const resolveUserName = (uid) => {
    const votes = userNameCache[uid];
    if (!votes || typeof votes === 'string') {
        /* 旧形式（文字列）との互換性 */
        return typeof votes === 'string' ? votes : null;
    }
    let best = null, max = 0;
    for (const [name, count] of Object.entries(votes)) {
        if (count > max) { best = name; max = count; }
    }
    return best;
};

/* 直近のbuildTalkStats結果（著者推定のフォールバックに使う） */
let _lastTalkStats = {};

/* 行データからユーザーごとの発言量統計を集計する */
const buildTalkStats = (rawLines) => {
    const stats = {};
    const idToName = {};
    const lines = normalizeLines(rawLines, { withUid: true });

    /* まず既知のuid→名前を引く */
    Object.keys(userNameCache).forEach(uid => {
        const name = resolveUserName(uid);
        if (name) idToName[uid] = name;
    });

    lines.forEach(line => {
        const { text, uid } = line;
        if (!uid || uid === 'unknown') return;

        const name = extractIconName(text);
        if (name) {
            idToName[uid] = name;
            voteUserName(currentProjectName, uid, name);
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
    return _lastTalkStats[uid] / total >= 0.02;
};

/* 統計を計算してfragmentに追加する（ページハンドラ共通） */
const appendStatsBlock = (fragment, rawLines) => {
    const { stats, idToName } = buildTalkStats(rawLines);
    if (!Object.keys(stats).length) return;
    const box = document.createElement('div');
    renderTalkStats(box, stats, idToName);
    fragment.appendChild(box);
};

/* 発言量統計をバーチャートとして描画する */
const renderTalkStats = (parentNode, stats, idToName) => {
    const entries = Object.entries(stats);
    if (!entries.length) return;

    appendSectionHeader(parentNode, '📊 発言数');
    const max = Math.max(...entries.map(([, v]) => v), 1);

    entries.sort((a, b) => b[1] - a[1]).forEach(([uid, count]) => {
        const name = idToName[uid] || resolveUserName(uid) || uid;

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
