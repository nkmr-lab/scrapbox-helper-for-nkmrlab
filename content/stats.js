/* ================= 統計処理 ==================== */

/* uid → 表示名 のキャッシュ（ScrapboxAPIのcollaboratorsから登録） */
let _userNameCache = {};
let _userNameCacheLoaded = false;

/* uid→名前マッピングをストレージから読み込む（旧投票オブジェクト形式が残っていれば最多得票名に正規化） */
const loadUserNameCache = async (projectName) => {
    if (_userNameCacheLoaded) return _userNameCache;
    const settings = await loadSettings(projectName);
    const raw = await loadFromStorage(getStorage(settings.syncUserMap), userMapKey(projectName), {});
    _userNameCache = {};
    for (const [uid, val] of Object.entries(raw)) {
        if (typeof val === 'string') {
            _userNameCache[uid] = val;
        } else if (val && typeof val === 'object') {
            /* 旧形式 {name: count} → 最多得票名にフラット化 */
            let best = null, max = 0;
            for (const [name, count] of Object.entries(val)) {
                if (count > max) { best = name; max = count; }
            }
            if (best) _userNameCache[uid] = best;
        }
    }
    _userNameCacheLoaded = true;
    return _userNameCache;
};

/* APIレスポンスのcollaboratorsからuid→名前を一括登録（60秒スロットル付き） */
let _lastCollaboratorsApply = 0;

const applyCollaborators = async (projectName, collaborators) => {
    if (!Array.isArray(collaborators) || !collaborators.length) return;

    const now = Date.now();
    if (now - _lastCollaboratorsApply < COLLABORATORS_REFRESH_INTERVAL) return;
    _lastCollaboratorsApply = now;

    let changed = false;
    collaborators.forEach(c => {
        if (!c.id) return;
        const name = c.displayName || c.name;
        if (!name) return;
        if (_userNameCache[c.id] === name) return;
        _userNameCache[c.id] = name;
        changed = true;
    });
    if (changed) {
        const settings = await loadSettings(projectName);
        getStorage(settings.syncUserMap).set({ [userMapKey(projectName)]: _userNameCache });
    }
};

/* uidに対する表示名を返す（未登録ならnull） */
const resolveUserName = (uid) => _userNameCache[uid] || null;

/* 直近のbuildTalkStats結果（著者推定のフォールバックに使う） */
let _lastTalkStats = {};

/* 正規化済みlines(withUid)からユーザーごとの発言量統計を集計する。
   アイコン記法を見つけたら局所的にidToNameを補完する（永続化はしない、collaboratorsが正規ソース） */
const buildTalkStats = (lines) => {
    const stats = {};
    const idToName = {};

    Object.keys(_userNameCache).forEach(uid => {
        const name = resolveUserName(uid);
        if (name) idToName[uid] = name;
    });

    lines.forEach(line => {
        const { text, uid } = line;
        if (!uid || uid === 'unknown') return;

        const iconName = extractIconName(text);
        if (iconName && !idToName[uid]) idToName[uid] = iconName;

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

/* 統計を計算してfragmentに追加する（ページハンドラ共通、linesは正規化済みwithUid） */
const appendStatsBlock = (fragment, lines) => {
    const { stats, idToName } = buildTalkStats(lines);
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
