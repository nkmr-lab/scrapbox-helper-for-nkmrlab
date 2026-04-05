/* ================= トップページ ================= */

const renderMyResearchNote = (panelNode, settings) => {
    if (!settings.userName) return;
    const pageName = `${formatYm(new Date())}_研究ノート_${settings.userName}`;

    appendSectionHeader(panelNode, '🧑 自分の研究ノート');
    appendItem(
        panelNode, '📅 ' + pageName,
        () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`)
    );
};

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
    renderFrequentPages(panelNode, history);
    renderHistory(panelNode, history);

    if (shouldShowPageCreate(settings)) {
        renderPageCreateMenu(panelNode, settings);
    }

    renderSettingsEntry(panelNode);

    document.body.appendChild(panelNode);
};
