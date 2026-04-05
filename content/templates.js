/* ================= ページ生成テンプレート + モーダル ================= */

const PRESENTATION_SLOT_COUNT = 3;

/* 発表練習ページのテンプレート本文を生成する */
const generatePresentationBody = (conferenceName) => {
    const slot = [
        '[(' + '* タイトル]', '# 名前', '発表時間：XX.XX', '',
        '[** コメント]', '', '', '[** 質問] ', ' ', '', '',
    ].join('\n');

    let body = `# ${conferenceName}\n\n`;
    for (let i = 0; i < PRESENTATION_SLOT_COUNT; i++) body += slot + '\n';
    return body;
};

/* --- モーダル --- */
/* ページ生成モーダルを開いて各種テンプレートを選択可能にする */
const openPageCreateModal = async () => {
    document.getElementById(PAGE_CREATE_MODAL_ID)?.remove();

    const settings = await loadSettings(currentProjectName);

    const overlay = document.createElement('div');
    overlay.id = PAGE_CREATE_MODAL_ID;
    overlay.className = 'sb-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const modal = document.createElement('div');
    modal.className = 'sb-modal';
    modal.onclick = (e) => e.stopPropagation();

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.className = 'sb-modal-close';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    const title = document.createElement('div');
    title.textContent = '📝 ページ生成';
    title.className = 'sb-modal-title';
    modal.appendChild(title);

    const _label = (text) => {
        const el = document.createElement('div');
        el.textContent = text;
        el.className = 'sb-settings-label';
        return el;
    };

    /* 研究ノート */
    if (settings.userName) {
        modal.appendChild(_label('研究ノート（年月指定）'));

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
            location.assign(generateCreateNoteUrl(currentProjectName, pageName, generateResearchNoteBody(date, settings.userName)));
        };

        noteRow.append(yearInput, monthInput, noteBtn);
        modal.appendChild(noteRow);
    }

    /* 発表練習 */
    modal.appendChild(_label('発表練習ページ'));

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
        location.assign(generateCreateNoteUrl(currentProjectName,
            `発表練習 ${name}（${formatYmd(new Date())}）`,
            generatePresentationBody(name)));
    };

    presRow.append(presInput, presBtn);
    modal.appendChild(presRow);

    /* 論文紹介 */
    modal.appendChild(_label('論文紹介ページ'));

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
        location.assign(generateCreateNoteUrl(currentProjectName, title, generatePaperIntroBody(title, settings.userName)));
    };

    paperRow.append(paperInput, paperBtn);
    modal.appendChild(paperRow);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};
