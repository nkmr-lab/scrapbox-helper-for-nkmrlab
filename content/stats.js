/* ================= 統計処理 ==================== */
/* 著者推定はすべて「行のuid（書き込み者ID）」を一次キーとし、
   表示名は /api/projects/:proj から取得した uid → displayName マップを使う（永続キャッシュなし、
   プロジェクト単位でセッションメモ）。当該ページのアイコン記法 `[name.icon]` でメンバー外を補完。 */

/* 現在ページの uid → 表示名 マップ（per-page、ページ遷移ごとに置換） */
let _currentUidNameMap = {};

/* プロジェクトメンバーマップに当該ページのアイコン記法情報をマージしてセットする。
   各レンダラーが描画前に必ず呼ぶ */
const applyProjectUsers = (projectUsers, lines) => {
    _currentUidNameMap = { ...(projectUsers || {}) };
    if (Array.isArray(lines)) {
        lines.forEach(line => {
            const iconName = extractIconName(line.text || '');
            if (iconName && line.uid && !_currentUidNameMap[line.uid]) {
                _currentUidNameMap[line.uid] = iconName;
            }
        });
    }
};

/* 現在ページのマップから uid に対する表示名を返す（未登録ならnull） */
const resolveUserName = (uid) => _currentUidNameMap[uid] || null;

/* 正規化済みlines(withUid)からユーザーごとの発言量統計を集計する */
const buildTalkStats = (lines) => {
    const stats = {};
    lines.forEach(line => {
        const { text, uid } = line;
        if (!uid || uid === 'unknown') return;
        if (text && !text.startsWith('[')) {
            stats[uid] = (stats[uid] || 0) + text.length;
        }
    });
    return stats;
};

/* 統計バーを fragment に追加する（applyCollaborators で設定された現在マップを使う） */
const appendStatsBlock = (fragment, lines) => {
    const stats = buildTalkStats(lines);
    if (!Object.keys(stats).length) return;
    const box = document.createElement('div');
    renderTalkStats(box, stats);
    fragment.appendChild(box);
};

/* 発言量統計をバーチャートとして描画する */
const renderTalkStats = (parentNode, stats) => {
    const entries = Object.entries(stats);
    if (!entries.length) return;

    appendSectionHeader(parentNode, '📊 発言数');
    const max = Math.max(...entries.map(([, v]) => v), 1);

    entries.sort((a, b) => b[1] - a[1]).forEach(([uid, count]) => {
        const name = resolveUserName(uid) || uid;

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
