/* ================= ページ生成 ================= */
/* テンプレート生成関数 + ページ生成モーダル */

/* --- Scrapbox ページ作成URL --- */

/* テンプレート本文付きのScrapboxページ作成URLを生成する */
const generateCreateNoteUrl = (project, pageName, body) =>
    `https://scrapbox.io/${project}/${encodeURIComponent(pageName)}?body=${encodeURIComponent(body)}`;

/* --- テンプレート --- */

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/* 指定月の研究ノートテンプレート本文を��成する */
const generateResearchNoteBody = (date, userName) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const prev = new Date(year, month - 1, 1);
    const next = new Date(year, month + 1, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();

    let body = `#${formatYm(prev)}_研究ノート_${userName} #${formatYm(next)}_研究ノート_${userName} #研究ノート_${userName}\n\n`;
    for (let d = 1; d <= lastDay; d++) {
        const day = new Date(year, month, d);
        body += `[*( ${formatYmd(day)} (${WEEK_LABELS[day.getDay()]})]\n\n\n`;
    }
    body += `#研究ノート\n\n`;
    return body;
};

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

/* 論文紹介ページのテンプレート本文を生���する */
const generatePaperIntroBody = (title, userName) => {
    const today = formatYmd(new Date());
    const year = new Date().getFullYear();

    return [
        '',
        '日付',
        `#${today}`,
        '',
        '発表者',
        userName ? `#${userName}` : '# 発表者名',
        '',
        '指定質問者',
        '# 指定質問者名',
        '',
        '著者',
        '[論文著者名] （共著含む。所属も）',
        '',
        'URL',
        '[論文のpdf]',
        '[slide]',
        '',
        '論文が投稿された学会',
        '',
        '',
        '論文の種類',
        '  #論文誌 , #学会誌',
        '',
        '[/icons/hr.icon]',
        '書記',
        '',
        '',
        '[(** 概要]',
        '[* 背景]',
        '',
        '[* 目的]',
        '',
        '[* 関連研究]',
        '',
        '[* 提案手法]',
        '',
        '[* 実験]',
        '',
        '[* 結果]',
        '',
        '[* 考察]',
        '',
        '[* まとめ]',
        '',
        '[(** 質問・コメント]',
        '',
        '',
        `#論文紹介関連 `,
        `#論文紹介${year}`,
    ].join('\n');
};

/* --- 学会プログラムからの議事録テンプレート生成 --- */

const PROGRAM_PARSE_PROMPT = `
以下は学会のプログラム（発表一覧）です。
このプログラムをパースして、以下のScrapbox記法の議事録テンプレートに変換してください。

セッションごとに以下の形式で出力:

[(** セッション名：座長名（あれば）]

[&* 発表タイトル]
[著者名1]（所属）, [著者名2]（所属）, ...

書記：
[* 概要]

[* 質疑]

[* コメント]


上記を各発表について繰り返してください。
最後に #学会議事録 タグを付けてください。

ルール:
- 著者名は全員 [名前] の形式で括る
- 所属がある場合は（所属）を付ける
- 発表番号は不要
- セッション名に座長が記載されていれば「セッション名：座長名」の形式にする
- 座長情報がない場合はセッション名のみ
- 余計な説明は不要。テンプレートのみ出力すること
`;

/* 学会プログラムテキストからScrapbox議事録テンプレートを生成する */
const generateFromProgram = async (programText) => {
    return await callOpenAI(PROGRAM_PARSE_PROMPT, programText);
};

/* --- モーダル --- */

/* ページ���成モーダルを開いて各種テンプレートを選択可能にする */
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

    /* 学会プログラムから生成（API Key設定時のみ） */
    if (settings.openaiApiKey) {
        modal.appendChild(_label('学会プログラムから議事録テンプレート生成'));

        const progArea = document.createElement('textarea');
        progArea.className = 'sb-textarea';
        progArea.placeholder = '学会プログラムのテキストを貼り付け';
        modal.appendChild(progArea);

        const progRow = document.createElement('div');
        progRow.className = 'sb-form-row';

        const progBtn = document.createElement('button');
        progBtn.textContent = '🧠 AIで生成';
        progBtn.className = 'sb-small-btn';

        const progStatus = document.createElement('span');
        progStatus.className = 'sb-batch-status';

        progRow.append(progBtn, progStatus);
        modal.appendChild(progRow);

        const resultArea = document.createElement('textarea');
        resultArea.className = 'sb-textarea sb-textarea--result';
        resultArea.readOnly = true;
        resultArea.placeholder = '生成結果がここに表示されます';
        resultArea.style.display = 'none';
        modal.appendChild(resultArea);

        const copyRow = document.createElement('div');
        copyRow.className = 'sb-form-row';
        copyRow.style.display = 'none';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 コピー';
        copyBtn.className = 'sb-small-btn';
        copyBtn.onclick = () => {
            resultArea.select();
            navigator.clipboard.writeText(resultArea.value);
            copyBtn.textContent = '✅ コピーしました';
            setTimeout(() => { copyBtn.textContent = '📋 コピー'; }, 2000);
        };

        copyRow.appendChild(copyBtn);
        modal.appendChild(copyRow);

        progBtn.onclick = async () => {
            const text = progArea.value.trim();
            if (!text) return;

            progBtn.disabled = true;
            progStatus.textContent = '生成中…';
            resultArea.style.display = 'none';
            copyRow.style.display = 'none';

            try {
                const result = await generateFromProgram(text);
                resultArea.value = result;
                resultArea.style.display = '';
                copyRow.style.display = '';
                progStatus.textContent = '';
            } catch (e) {
                progStatus.textContent = '❌ エラーが発生しました';
                console.error(e);
            } finally {
                progBtn.disabled = false;
            }
        };
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};
