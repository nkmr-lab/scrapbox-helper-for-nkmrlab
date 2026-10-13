/* ================= トップページ ================= */

/* 自分の今月の研究ノートへのリンクをパネルに追加する */
const renderMyResearchNote = (panelNode, settings) => {
    if (!settings.userName) return;
    const pageName = `${formatYm(new Date())}_研究ノート_${settings.userName}`;

    appendSectionHeader(panelNode, '🧑 自分の研究ノート');
    appendItem(
        panelNode, '📅 ' + pageName,
        () => navigateToPage(pageName)
    );
};

/* プロジェクトトップページのパネルを描画する */
const renderProjectTop = async () => {
    const seq = currentNavigation();
    const projectName = currentProjectName;
    const settings = await loadSettings(projectName);
    const history = await loadHistory(projectName);
    const pinnedPages = await loadPinnedPages(projectName);
    if (!isExtensionAlive() || isStaleNavigation(seq)) return;

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, () => {
        const parent = document.createElement('div');
        parent.className = 'sb-panel';
        applyPanelSettings(parent, 'main');
        /* トップではフロートメニューを出していないので、閉じたら代わりにメニューを出す（何も無くならないように） */
        appendCloseButton(parent, MAIN_PANEL_ID, () => openFloatMenu());
        appendPanelTitle(parent, 'Project: ' + currentProjectName);
        return parent;
    });
    if (!panelNode) return;

    if (shouldShowLabPay(settings)) appendLabPaySection(panelNode);
    renderMyResearchNote(panelNode, settings);
    renderPinnedPages(panelNode, pinnedPages);
    await renderFrequentPages(panelNode, history);
    await renderHistory(panelNode, history);
    if (isStaleNavigation(seq)) return;
    renderMenuButtons(panelNode, shouldShowPageCreate(settings));

    document.body.appendChild(panelNode);
};
