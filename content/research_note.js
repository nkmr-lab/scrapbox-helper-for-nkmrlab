/* ================= 研究ノート ================= */
/* カレンダー上の研究ノート作成UIとページ判定 */

/* --- ページ判定 --- */

/* ページが自分の研究ノートかどうか判定する */
const isMyResearchNotePage = (pageName, userName) => {
    if (!pageName || !userName) return false;
    return pageName.includes(`研究ノート_${userName}`);
};

/* ペー���が自分の今月の研究ノートかどう���判定する */
const isMyThisMonthResearchNote = (pageName, userName) => {
    if (!isMyResearchNotePage(pageName, userName)) return false;
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return false;
    const now = new Date();
    return +m[1] === now.getFullYear() && +m[2] === now.getMonth() + 1;
};

/* --- カレンダー上の作成UI --- */

/* 行データ中の日付ヘッダーの数を数える */
const countDateHeaders = (lines) =>
    lines.filter(line => /^\[\*\(\s*20\d{2}\.\d{2}\.\d{2}/.test(line.text || '')).length;

/* ページ名から年月のDateオブジェクトを抽出する */
const extractYearMonthFromPageName = (pageName) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, 1);
};

/* 研究ノート作成UIを削除する */
const removeResearchNoteCreateUI = () => {
    document.getElementById(CALENDAR_CREATE_UI_ID)?.remove();
};

/* 研究ノート未作成時の作成ボタンUIを描画する */
const renderResearchNoteCreateUI = ({ userName, pageName, rawLines }) => {
    if (!pageName || !/研究ノート/.test(pageName) || !userName) return;
    if (!isMyResearchNotePage(pageName, userName)) return;

    const calendarPanel = document.getElementById(CALENDAR_PANEL_ID);
    if (!calendarPanel) return;
    if (countDateHeaders(rawLines) > 0) return;

    const baseDate = extractYearMonthFromPageName(pageName);
    if (!baseDate) return;
    if (calendarPanel.querySelector('#' + CALENDAR_CREATE_UI_ID)) return;

    const box = document.createElement('div');
    box.id = CALENDAR_CREATE_UI_ID;
    box.className = 'sb-cal-create-ui';

    const ym = formatYm(baseDate);
    const msg = document.createElement('div');
    msg.textContent = `⚠ ${ym} の研究ノートがまだ作成されていません`;
    msg.className = 'sb-create-msg';
    box.appendChild(msg);

    const btn = document.createElement('button');
    btn.textContent = `${ym} の研究ノートを作成する（作成後に書き込みするとこのボタンは消えます）`;
    btn.onclick = () => {
        const targetPage = `${ym}_研究ノート_${userName}`;
        const body = generateResearchNoteBody(baseDate, userName);
        removeResearchNoteCreateUI();
        location.assign(generateCreateNoteUrl(currentProjectName, targetPage, body));
    };

    box.appendChild(btn);
    calendarPanel.prepend(box);
};
