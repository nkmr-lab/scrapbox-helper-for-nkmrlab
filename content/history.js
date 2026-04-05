/* ================= 履歴管理 ================= */

const saveHistory = (projectName, pageName) => {
    if (!projectName || !pageName) return;

    chrome.storage.local.get(
        { [historyKey(projectName)]: [] },
        data => {
            const list = data[historyKey(projectName)];
            if (list.length && list[list.length - 1].pageName === pageName) return;
            list.push({ pageName, ts: Date.now() });
            chrome.storage.local.set({
                [historyKey(projectName)]: list.slice(-HISTORY_LIMIT)
            });
        }
    );
};

const normalizeHistoryEntries = (history) => {
    if (!Array.isArray(history)) return [];

    return history
        .filter(entry => entry && typeof entry.pageName === 'string' && entry.pageName.trim() !== '')
        .map(entry => ({ pageName: entry.pageName, ts: typeof entry.ts === 'number' ? entry.ts : 0 }));
};

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

const renderHistory = (panelNode, history) => {
    const items = getRecentPages(history);
    if (!items.length) return;

    appendSectionHeader(panelNode, '🕒 最近見たページ');
    items.forEach(item => {
        appendTextNode(
            panelNode, '・' + item.pageName, ITEM_STYLE,
            () => location.assign(`/${currentProjectName}/${encodeURIComponent(item.pageName)}`)
        );
    });
};

const renderFrequentPages = (panelNode, history) => {
    const freq = {};
    history.forEach(item => {
        freq[item.pageName] = (freq[item.pageName] || 0) + 1;
    });

    const items = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, FREQUENT_PAGES_LIMIT);
    if (!items.length) return;

    appendSectionHeader(panelNode, '⭐ よく見ているページ');
    items.forEach(([pageName, count]) => {
        appendTextNode(
            panelNode, '・' + `${pageName} (${count})`, ITEM_STYLE,
            () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`)
        );
    });
};
