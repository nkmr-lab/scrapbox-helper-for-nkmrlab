/* ================= ページ生成テンプレート + メニュー ================= */

/* --- 発表練習テンプレート --- */
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

/* --- ページ生成メニュー（フロートメニュー等から呼ばれる） --- */
const renderPageCreateMenu = (panelNode, settings) => {
    const container = document.createElement('div');
    container.className = 'sb-settings-field';

    appendSectionHeader(panelNode, '📝 ページ生成', () => {
        container.style.display = container.style.display !== 'none' ? 'none' : '';
    });
    container.style.display = 'none';

    /* 研究ノート */
    if (settings.userName) {
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
        monthInput.min = '1'; monthInput.max = '12';
        monthInput.className = 'sb-form-input';
        monthInput.placeholder = '月';

        const noteBtn = document.createElement('button');
        noteBtn.textContent = '作成';
        noteBtn.className = 'sb-small-btn';
        noteBtn.onclick = () => {
            const y = +yearInput.value, m = +monthInput.value;
            if (!y || m < 1 || m > 12) return;
            const date = new Date(y, m - 1, 1);
            const pageName = `${formatYm(date)}_研究ノート_${settings.userName}`;
            location.assign(buildCreateNoteUrl(currentProjectName, pageName, generateResearchNoteBody(date, settings.userName)));
        };

        const label = document.createElement('div');
        label.textContent = '研究ノート（年月指定）';
        label.className = 'sb-settings-label';

        noteRow.append(yearInput, monthInput, noteBtn);
        container.append(label, noteRow);
    }

    /* 発表練習 */
    const presRow = document.createElement('div');
    presRow.className = 'sb-form-row';

    const presInput = document.createElement('input');
    presInput.type = 'text'; presInput.placeholder = '学会名';
    presInput.className = 'sb-form-input';

    const presBtn = document.createElement('button');
    presBtn.textContent = '作成'; presBtn.className = 'sb-small-btn';
    presBtn.onclick = () => {
        const name = presInput.value.trim();
        if (!name) return;
        location.assign(buildCreateNoteUrl(currentProjectName,
            `発表練習 ${name}（${formatYmd(new Date())}）`,
            generatePresentationBody(name)));
    };

    const presLabel = document.createElement('div');
    presLabel.textContent = '発表練習ページ'; presLabel.className = 'sb-settings-label';
    presRow.append(presInput, presBtn);
    container.append(presLabel, presRow);

    /* 論文紹介 */
    const paperRow = document.createElement('div');
    paperRow.className = 'sb-form-row';

    const paperInput = document.createElement('input');
    paperInput.type = 'text'; paperInput.placeholder = '論文タイトル';
    paperInput.className = 'sb-form-input';

    const paperBtn = document.createElement('button');
    paperBtn.textContent = '作成'; paperBtn.className = 'sb-small-btn';
    paperBtn.onclick = () => {
        const title = paperInput.value.trim();
        if (!title) return;
        location.assign(buildCreateNoteUrl(currentProjectName, title, generatePaperIntroBody(title, settings.userName)));
    };

    const paperLabel = document.createElement('div');
    paperLabel.textContent = '論文紹介ページ'; paperLabel.className = 'sb-settings-label';
    paperRow.append(paperInput, paperBtn);
    container.append(paperLabel, paperRow);

    panelNode.appendChild(container);
};
