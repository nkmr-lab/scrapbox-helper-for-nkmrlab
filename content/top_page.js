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
    const settings = await loadSettings(projectName);

    if (!isExtensionAlive() || projectName !== currentProjectName) return;

    const history = await loadHistory(projectName);
    const pinnedPages = await loadPinnedPages(projectName);

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, () => {
        const parent = document.createElement('div');
        parent.className = 'sb-panel';
        applyPanelSettings(parent, 'main');
        attachCloseButton(parent, MAIN_PANEL_ID);
        appendPanelTitle(parent, 'Project: ' + currentProjectName);
        return parent;
    });

    renderMyResearchNote(panelNode, settings);
    renderPinnedPages(panelNode, pinnedPages);
    await renderFrequentPages(panelNode, history);
    await renderHistory(panelNode, history);
    renderMenuButtons(panelNode, shouldShowPageCreate(settings));

    document.body.appendChild(panelNode);
};
