/* ================= フロートメニュー ================= */
/* 全ページ共通で表示。トグルボタン + 展開パネル。 */

const shouldShowPageCreate = (settings) => {
    const v = settings.showPageCreate || 'auto';
    if (v === 'show') return true;
    if (v === 'hide') return false;
    return isNkmrLabProject();
};

const renderFloatMenu = async () => {
    /* 既に存在する場合は除去して再生成 */
    document.getElementById(FLOAT_MENU_ID)?.remove();

    const settings = await loadSettings(currentProjectName);
    const showCreate = shouldShowPageCreate(settings);

    /* ===== トグルボタン ===== */
    const wrapper = document.createElement('div');
    wrapper.id = FLOAT_MENU_ID;

    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sb-float-toggle';
    toggleBtn.textContent = '☰';

    const panel = document.createElement('div');
    panel.className = 'sb-float-panel';
    panel.style.display = 'none';

    toggleBtn.onclick = () => {
        const open = panel.style.display !== 'none';
        panel.style.display = open ? 'none' : '';
        toggleBtn.textContent = open ? '☰' : '✕';
    };

    /* ===== 履歴セクション ===== */
    const historyData = await new Promise(resolve => {
        chrome.storage.local.get(
            { [historyKey(currentProjectName)]: [] },
            data => resolve(data[historyKey(currentProjectName)])
        );
    });
    const history = normalizeHistoryEntries(historyData);

    renderFrequentPages(panel, history);
    renderHistory(panel, history);

    /* ===== ページ生成セクション ===== */
    if (showCreate) {
        renderPageCreateMenu(panel, settings);
    }

    /* ===== 設定 ===== */
    renderSettingsEntry(panel);

    wrapper.append(toggleBtn, panel);
    document.body.appendChild(wrapper);
};

const removeFloatMenu = () => {
    document.getElementById(FLOAT_MENU_ID)?.remove();
};
