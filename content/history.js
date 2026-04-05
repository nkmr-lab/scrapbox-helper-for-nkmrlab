/* ================= ピン留め ================= */

const loadPinnedPages = (projectName) => {
    return new Promise(resolve => {
        chrome.storage.local.get(
            { [pinnedKey(projectName)]: [] },
            data => resolve(data[pinnedKey(projectName)] || [])
        );
    });
};

const savePinnedPages = (projectName, pinned) => {
    chrome.storage.local.set({ [pinnedKey(projectName)]: pinned });
};

const pinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    if (pinned.includes(pageName)) return;
    pinned.push(pageName);
    savePinnedPages(projectName, pinned);
};

const unpinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    const filtered = pinned.filter(p => p !== pageName);
    savePinnedPages(projectName, filtered);
};

const isPagePinned = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    return pinned.includes(pageName);
};

const renderPinnedPages = (panelNode, pinned) => {
    if (!pinned.length) return;

    appendSectionHeader(panelNode, '📌 ピン留め');
    pinned.forEach(pageName => {
        const row = document.createElement('div');
        row.className = 'sb-item sb-pin-row';

        const link = document.createElement('span');
        link.textContent = '・' + pageName;
        link.className = 'sb-pin-link';
        link.onclick = () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`);

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '✕';
        removeBtn.className = 'sb-pin-remove';
        removeBtn.onclick = async (e) => {
            e.stopPropagation();
            await unpinPage(currentProjectName, pageName);
            row.remove();
        };

        row.append(link, removeBtn);
        panelNode.appendChild(row);
    });
};

/* ================= 履歴管理 ================= */

const saveHistory = (projectName, pageName) => {
    if (!projectName || !pageName) return;
    chrome.storage.local.get(
        { [historyKey(projectName)]: [] },
        data => {
            const list = data[historyKey(projectName)];
            if (list.length && list[list.length - 1].pageName === pageName) return;
            list.push({ pageName, ts: Date.now() });
            chrome.storage.local.set({ [historyKey(projectName)]: list.slice(-HISTORY_LIMIT) });
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
        appendItem(panelNode, '・' + item.pageName,
            () => location.assign(`/${currentProjectName}/${encodeURIComponent(item.pageName)}`));
    });
};

const renderFrequentPages = (panelNode, history) => {
    const freq = {};
    history.forEach(item => { freq[item.pageName] = (freq[item.pageName] || 0) + 1; });

    const items = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, FREQUENT_PAGES_LIMIT);
    if (!items.length) return;

    appendSectionHeader(panelNode, '⭐ よく見ているページ');
    items.forEach(([pageName, count]) => {
        appendItem(panelNode, '・' + `${pageName} (${count})`,
            () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`));
    });
};
