/* ================= ピン留め ================= */

/* ピン留めページ一覧をストレージから読み込む */
const loadPinnedPages = async (projectName) => {
    await retireSyncOnce(projectName);
    return loadFromStorage(chrome.storage.local, pinnedKey(projectName), []);
};

/* ピン留めページ一覧をストレージに保存する */
const savePinnedPages = async (projectName, pinned) => {
    await chrome.storage.local.set({ [pinnedKey(projectName)]: pinned });
};

/* 指定ページをピン留めに追加する */
const pinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    if (pinned.includes(pageName)) return;
    pinned.push(pageName);
    await savePinnedPages(projectName, pinned);
};

/* 指定ページのピン留めを解除する */
const unpinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    await savePinnedPages(projectName, pinned.filter(p => p !== pageName));
};

/* 指定ページがピン留めされているか判定する */
const isPagePinned = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    return pinned.includes(pageName);
};

/* ピン留めページ一覧をパネルに描画する */
const renderPinnedPages = (panelNode, pinned) => {
    if (!pinned.length) return;

    appendSectionHeader(panelNode, '📌 ピン留め');
    pinned.forEach(pageName => {
        const row = document.createElement('div');
        row.className = 'sb-item sb-pin-row';

        const link = document.createElement('span');
        link.textContent = '・' + pageName;
        link.className = 'sb-pin-link';
        link.onclick = () => navigateToPage(pageName);

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
