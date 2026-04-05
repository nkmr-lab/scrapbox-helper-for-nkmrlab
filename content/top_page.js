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

/* --- 発表練習ページ生成 --- */
const PRESENTATION_SLOT_COUNT = 3;

const generatePresentationBody = (conferenceName) => {
    const slot = [
        '[(' + '* タイトル]', '# 名前', '発表時間：XX.XX', '',
        '[** コメント]', '', '', '[** 質問] ', ' ', '', '',
    ].join('\n');

    let body = `# ${conferenceName}\n\n`;
    for (let i = 0; i < PRESENTATION_SLOT_COUNT; i++) body += slot + '\n';
    return body;
};

const renderPresentationCreateUI = (panelNode) => {
    appendSectionHeader(panelNode, '🎤 発表練習ページを作成');

    const row = document.createElement('div');
    row.className = 'sb-form-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '学会名';
    input.className = 'sb-form-input';

    const btn = document.createElement('button');
    btn.textContent = '生成';
    btn.className = 'sb-small-btn';

    btn.onclick = () => {
        const name = input.value.trim();
        if (!name) return;
        const pageName = `発表練習 ${name}（${formatYmd(new Date())}）`;
        const body = generatePresentationBody(name);
        location.assign(buildCreateNoteUrl(currentProjectName, pageName, body));
    };

    row.append(input, btn);
    panelNode.appendChild(row);
};

/* --- トップページ描画 --- */
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
    renderPresentationCreateUI(panelNode);
    renderFrequentPages(panelNode, history);
    renderHistory(panelNode, history);
    renderSettingsEntry(panelNode);

    document.body.appendChild(panelNode);
};
