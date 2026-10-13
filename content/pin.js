/* ================= ピン留め ================= */

/* ピン留めページ一覧をストレージから読み込む（sync設定に従う）。
   同期が既定ONになる前の版はこのPC（local）に保存していたので、同期ONなのに local に残っている分は
   同期領域へ一度だけ合流させ、local からは消す（残すと外したピンが次回 local から復活する） */
const loadPinnedPages = async (projectName) => {
    const settings = await loadSettings(projectName);
    const key = pinnedKey(projectName);
    const pinned = await loadFromStorage(getStorage(settings.syncPinned), key, []);
    if (!settings.syncPinned) return pinned;

    const local = await loadFromStorage(chrome.storage.local, key, null);
    if (!Array.isArray(local) || !local.length) return pinned;
    const merged = [...pinned, ...local.filter(p => !pinned.includes(p))];
    try {
        if (merged.length !== pinned.length) await getStorage(true).set({ [key]: merged });
        await chrome.storage.local.remove(key);
    } catch (e) {
        console.warn('[SB Helper] ピン留めを同期領域へ移せませんでした:', e);
    }
    return merged;
};

/* ピン留めページ一覧をストレージに保存する（sync設定に従う） */
const savePinnedPages = async (projectName, pinned) => {
    const settings = await loadSettings(projectName);
    getStorage(settings.syncPinned).set({ [pinnedKey(projectName)]: pinned });
};

/* ピン留めの保存先（同期/このPC）を切り替えた時、元の保存先の分を新しい保存先へ合流させる */
const migratePinnedStore = async (projectName, fromSync, toSync) => {
    const key = pinnedKey(projectName);
    const from = await loadFromStorage(getStorage(fromSync), key, []);
    const to = await loadFromStorage(getStorage(toSync), key, []);
    const merged = [...to, ...from.filter(p => !to.includes(p))];
    await getStorage(toSync).set({ [key]: merged });
};

/* 指定ページをピン留めに追加する */
const pinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    if (pinned.includes(pageName)) return;
    pinned.push(pageName);
    savePinnedPages(projectName, pinned);
};

/* 指定ページのピン留めを解除する */
const unpinPage = async (projectName, pageName) => {
    const pinned = await loadPinnedPages(projectName);
    savePinnedPages(projectName, pinned.filter(p => p !== pageName));
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
