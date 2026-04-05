/* ================= 統計処理 ==================== */
let userNameCache = {};
let userNameCacheLoaded = false;

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

const saveUserNameToCache = (projectName, uid, name) => {
    if (!uid || !name) return;
    if (userNameCache[uid] === name) return;
    userNameCache[uid] = name;
    chrome.storage.local.set({ [userMapKey(projectName)]: userNameCache });
};

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
    return { stats, idToName };
};

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

const createTalkStatsBlock = (rawLines) => {
    const { stats, idToName } = buildTalkStats(rawLines);
    if (!Object.keys(stats).length) return null;
    const box = document.createElement('div');
    renderTalkStats(box, stats, idToName);
    return box;
};
