/* ================= 統計処理 ==================== */
/* 著者推定はすべて「行のuid（書き込み者ID）」を一次キーとし、
   表示名は当該ページの collaborators 配列から都度引く（永続キャッシュなし）。
   collaborators に該当が無いuidは、ページ内のアイコン記法 `[name.icon]` で補完、
   それも無ければuidをそのまま表示する。
   これにより同名取り違えや、別ページのキャッシュ汚染を排除する。 */

/* 現在ページの uid → 表示名 マップ（per-page、ページ遷移ごとに置換） */
let _currentUidNameMap = {};

/* collaborators配列 + 当該ページの行データ から uid→表示名マップを構築する */
const buildUidNameMap = (collaborators, lines) => {
    const map = {};
    if (Array.isArray(collaborators)) {
        collaborators.forEach(c => {
            const name = c?.displayName || c?.name;
            if (c?.id && name) map[c.id] = name;
        });
    }
    if (Array.isArray(lines)) {
        lines.forEach(line => {
            const iconName = extractIconName(line.text || '');
            if (iconName && line.uid && !map[line.uid]) map[line.uid] = iconName;
        });
    }
    return map;
};

/* 当該ページの collaborators と正規化済みlines を渡して、resolveUserName が引けるようにする。
   各レンダラーが描画前に必ず呼ぶ */
const applyCollaborators = (collaborators, lines) => {
    _currentUidNameMap = buildUidNameMap(collaborators, lines);
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
