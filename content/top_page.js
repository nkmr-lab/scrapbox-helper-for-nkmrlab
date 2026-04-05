/* ================= トップページ ================= */

/* 自分の今月の研究ノートへのリンクをパネルに追加する */
const renderMyResearchNote = (panelNode, settings) => {
    if (!settings.userName) return;
    const pageName = `${formatYm(new Date())}_研究ノート_${settings.userName}`;

    appendSectionHeader(panelNode, '🧑 自分の研究ノート');
    appendItem(
        panelNode, '📅 ' + pageName,
        () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`)
    );
};

/* プロジェクトトップページのパネルを描画する */
const renderProjectTop = async () => {
    const projectName = currentProjectName;

    const historyData = await new Promise(resolve => {
        chrome.storage.local.get(
            { [historyKey(projectName)]: [] },
            data => resolve(data[historyKey(projectName)])
        );
    });

    if (!isExtensionAlive()) return;
    const settings = await loadSettings(projectName);
    if (!isExtensionAlive()) return;
    if (projectName !== currentProjectName) return;

    const history = normalizeHistoryEntries(historyData);

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, () => {
        const parent = document.createElement('div');
        parent.className = 'sb-panel';
        applyPanelSettings(parent, 'main');
        attachCloseButton(parent, MAIN_PANEL_ID);
        appendPanelTitle(parent, 'Project: ' + currentProjectName);
        return parent;
    });

    renderMyResearchNote(panelNode, settings);

    const pinnedPages = await loadPinnedPages(projectName);
    renderPinnedPages(panelNode, pinnedPages);

    renderFrequentPages(panelNode, history);
    renderHistory(panelNode, history);

    const btnRow = document.createElement('div');
    btnRow.className = 'sb-form-row sb-menu-btn-row';

    if (shouldShowPageCreate(settings)) {
        const createBtn = document.createElement('button');
        createBtn.textContent = '📝 ページ生成';
        createBtn.className = 'sb-menu-btn';
        createBtn.onclick = () => openPageCreateModal();
        btnRow.appendChild(createBtn);
    }

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '⚙ 設定';
    settingsBtn.className = 'sb-menu-btn';
    settingsBtn.onclick = () => openSettingsModal();
    btnRow.appendChild(settingsBtn);

    panelNode.appendChild(btnRow);

    document.body.appendChild(panelNode);
};
