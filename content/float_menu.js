/* ================= フロートメニュー ================= */

const FLOAT_MENU_SEEN_KEY = '__sb_float_menu_seen__';

const shouldShowPageCreate = (settings) => {
    const v = settings.showPageCreate || 'auto';
    if (v === 'show') return true;
    if (v === 'hide') return false;
    return isNkmrLabProject();
};

const getCurrentPageName = () => {
    const match = location.pathname.match(/^\/[^/]+\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
};

const renderFloatMenu = async () => {
    document.getElementById(FLOAT_MENU_ID)?.remove();

    const settings = await loadSettings(currentProjectName);
    const showCreate = shouldShowPageCreate(settings);
    const firstTime = !sessionStorage.getItem(FLOAT_MENU_SEEN_KEY);

    document.documentElement.style.setProperty('--sb-floatMenuWidth', settings.floatMenuWidth + 'px');

    const wrapper = document.createElement('div');
    wrapper.id = FLOAT_MENU_ID;

    /* トグルボタン */
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sb-float-toggle';
    toggleBtn.textContent = '☰ メニュー';

    /* パネル */
    const panel = document.createElement('div');
    panel.className = 'sb-float-panel';

    const setOpen = (open) => {
        panel.style.display = open ? '' : 'none';
        toggleBtn.textContent = open ? '✕ 閉じる' : '☰ メニュー';
    };

    toggleBtn.onclick = () => {
        const open = panel.style.display === 'none';
        setOpen(open);
        if (!firstTime || open) sessionStorage.setItem(FLOAT_MENU_SEEN_KEY, '1');
    };

    setOpen(firstTime);

    if (firstTime) {
        setTimeout(() => {
            if (panel.style.display !== 'none') {
                setOpen(false);
                sessionStorage.setItem(FLOAT_MENU_SEEN_KEY, '1');
            }
        }, 4000);
    }

    /* ピン留めボタン（ページ閲覧時のみ） */
    const pageName = getCurrentPageName();
    if (pageName) {
        const pinned = await isPagePinned(currentProjectName, pageName);
        const pinBtn = document.createElement('button');
        pinBtn.className = 'sb-pin-btn';
        pinBtn.textContent = pinned ? '📌 ピン留め解除' : '📌 このページをピン留め';
        pinBtn.onclick = async () => {
            if (await isPagePinned(currentProjectName, pageName)) {
                await unpinPage(currentProjectName, pageName);
                pinBtn.textContent = '📌 このページをピン留め';
            } else {
                await pinPage(currentProjectName, pageName);
                pinBtn.textContent = '📌 ピン留め解除';
            }
        };
        panel.appendChild(pinBtn);
    }

    /* ピン留めリスト */
    const pinnedPages = await loadPinnedPages(currentProjectName);
    renderPinnedPages(panel, pinnedPages);

    /* 履歴 */
    const historyData = await new Promise(resolve => {
        chrome.storage.local.get(
            { [historyKey(currentProjectName)]: [] },
            data => resolve(data[historyKey(currentProjectName)])
        );
    });
    const history = normalizeHistoryEntries(historyData);

    renderFrequentPages(panel, history);
    renderHistory(panel, history);

    if (showCreate) renderPageCreateMenu(panel, settings);
    renderSettingsEntry(panel);

    wrapper.append(toggleBtn, panel);
    document.body.appendChild(wrapper);
};

const removeFloatMenu = () => {
    document.getElementById(FLOAT_MENU_ID)?.remove();
};
