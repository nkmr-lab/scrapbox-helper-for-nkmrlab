/* ================= フロートメニュー ================= */

/* ページ生成メニューを表示すべきか判定する */
const shouldShowPageCreate = (settings) => {
    const v = settings.showPageCreate || 'auto';
    if (v === 'show') return true;
    if (v === 'hide') return false;
    return isNkmrLabProject();
};

/* 現在表示中のページ名をURLから取得する */
const getCurrentPageName = () => {
    const match = location.pathname.match(/^\/[^/]+\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
};

/* ピン留めボタンとピン留めリストをパネルに描画する */
const _renderPinSection = async (panel, pageName) => {
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

    const pinnedPages = await loadPinnedPages(currentProjectName);
    renderPinnedPages(panel, pinnedPages);
};

/* フロートメニューを開く */
const openFloatMenu = async () => {
    document.getElementById(FLOAT_MENU_ID)?.remove();

    const settings = await loadSettings(currentProjectName);

    document.documentElement.style.setProperty('--sb-floatMenuWidth', settings.floatMenuWidth + 'px');

    const pos = settings.floatMenuPosition || 'bottom-right';
    const isBottom = pos.startsWith('bottom');
    const isRight = pos.endsWith('right');

    const wrapper = document.createElement('div');
    wrapper.id = FLOAT_MENU_ID;

    /* トグルボタン */
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sb-float-toggle';
    toggleBtn.textContent = '☰ メニュー';

    if (isBottom) { toggleBtn.style.bottom = '16px'; } else { toggleBtn.style.top = '16px'; }
    if (isRight)  { toggleBtn.style.right = '16px'; }  else { toggleBtn.style.left = '16px'; }

    /* パネル */
    const panel = document.createElement('div');
    panel.className = 'sb-float-panel';

    if (isBottom) { panel.style.bottom = '52px'; } else { panel.style.top = '52px'; }
    if (isRight)  { panel.style.right = '16px'; }  else { panel.style.left = '16px'; }

    const setOpen = (open) => {
        panel.style.display = open ? '' : 'none';
        toggleBtn.textContent = open ? '✕ 閉じる' : '☰ メニュー';
    };

    /* ホバーで開く、ボタンクリックまたはパネル外クリックで閉じる */
    toggleBtn.onmouseenter = () => setOpen(true);
    toggleBtn.onclick = () => setOpen(false);

    /* パネル外クリックで閉じる（前回のリスナーをクリーンアップ） */
    if (window._sbFloatMenuClickHandler) {
        document.removeEventListener('click', window._sbFloatMenuClickHandler);
    }
    window._sbFloatMenuClickHandler = (e) => {
        if (panel.style.display === 'none') return;
        if (wrapper.contains(e.target)) return;
        setOpen(false);
    };
    document.addEventListener('click', window._sbFloatMenuClickHandler);

    setOpen(false);

    /* コンテンツ */
    await _renderPinSection(panel, getCurrentPageName());

    const history = await loadHistory(currentProjectName);
    renderFrequentPages(panel, history);
    renderHistory(panel, history);

    renderMenuButtons(panel, shouldShowPageCreate(settings));

    wrapper.append(toggleBtn, panel);
    document.body.appendChild(wrapper);
};

/* フロートメニューを閉じる */
const closeFloatMenu = () => {
    document.getElementById(FLOAT_MENU_ID)?.remove();
    if (window._sbFloatMenuClickHandler) {
        document.removeEventListener('click', window._sbFloatMenuClickHandler);
        window._sbFloatMenuClickHandler = null;
    }
};
