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

/* ================= ページ生成メニュー ================= */

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

const renderPageCreateMenu = (panelNode, settings) => {
    const container = document.createElement('div');
    container.className = 'sb-settings-field';

    appendSectionHeader(panelNode, '📝 ページ生成', () => {
        const visible = container.style.display !== 'none';
        container.style.display = visible ? 'none' : '';
    });

    container.style.display = 'none';

    /* --- 研究ノート作成 --- */
    if (settings.userName) {
        const noteLabel = document.createElement('div');
        noteLabel.textContent = '研究ノート（年月指定）';
        noteLabel.className = 'sb-settings-label';

        const noteRow = document.createElement('div');
        noteRow.className = 'sb-form-row';

        const yearInput = document.createElement('input');
        yearInput.type = 'number';
        yearInput.value = new Date().getFullYear();
        yearInput.className = 'sb-form-input';
        yearInput.placeholder = '年';

        const monthInput = document.createElement('input');
        monthInput.type = 'number';
        monthInput.value = new Date().getMonth() + 1;
        monthInput.min = '1';
        monthInput.max = '12';
        monthInput.className = 'sb-form-input';
        monthInput.placeholder = '月';

        const noteBtn = document.createElement('button');
        noteBtn.textContent = '作成';
        noteBtn.className = 'sb-small-btn';

        noteBtn.onclick = () => {
            const y = +yearInput.value;
            const m = +monthInput.value;
            if (!y || m < 1 || m > 12) return;

            const date = new Date(y, m - 1, 1);
            const ym = formatYm(date);
            const pageName = `${ym}_研究ノート_${settings.userName}`;
            const body = generateResearchNoteBody(date, settings.userName);
            location.assign(buildCreateNoteUrl(currentProjectName, pageName, body));
        };

        noteRow.append(yearInput, monthInput, noteBtn);
        container.append(noteLabel, noteRow);
    }

    /* --- 発表練習ページ作成 --- */
    const presLabel = document.createElement('div');
    presLabel.textContent = '発表練習ページ';
    presLabel.className = 'sb-settings-label';

    const presRow = document.createElement('div');
    presRow.className = 'sb-form-row';

    const presInput = document.createElement('input');
    presInput.type = 'text';
    presInput.placeholder = '学会名';
    presInput.className = 'sb-form-input';

    const presBtn = document.createElement('button');
    presBtn.textContent = '作成';
    presBtn.className = 'sb-small-btn';

    presBtn.onclick = () => {
        const name = presInput.value.trim();
        if (!name) return;
        const pageName = `発表練習 ${name}（${formatYmd(new Date())}）`;
        const body = generatePresentationBody(name);
        location.assign(buildCreateNoteUrl(currentProjectName, pageName, body));
    };

    presRow.append(presInput, presBtn);
    container.append(presLabel, presRow);

    panelNode.appendChild(container);
};

/* ================= トップページ描画 ================= */

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
    renderPageCreateMenu(panelNode, settings);
    renderFrequentPages(panelNode, history);
    renderHistory(panelNode, history);
    renderSettingsEntry(panelNode);

    document.body.appendChild(panelNode);
};
