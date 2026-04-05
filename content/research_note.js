/* ================= 研究ノート：作成ヘルパー ================= */

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

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

const isMyResearchNotePage = (pageName, userName) => {
    if (!pageName || !userName) return false;
    return pageName.includes(`研究ノート_${userName}`);
};

const isMyThisMonthResearchNote = (pageName, userName) => {
    if (!isMyResearchNotePage(pageName, userName)) return false;
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return false;
    const now = new Date();
    return +m[1] === now.getFullYear() && +m[2] === now.getMonth() + 1;
};

const buildCreateNoteUrl = (project, pageName, body) =>
    `https://scrapbox.io/${project}/${encodeURIComponent(pageName)}?body=${encodeURIComponent(body)}`;

const countDateHeaders = (lines) =>
    lines.filter(line => /^\[\*\(\s*20\d{2}\.\d{2}\.\d{2}/.test(line.text || '')).length;

const extractYearMonthFromPageName = (pageName) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, 1);
};

const removeResearchNoteCreateUI = () => {
    document.getElementById(CALENDAR_CREATE_UI_ID)?.remove();
};

const renderResearchNoteCreateUI = ({ userName, pageName, rawLines }) => {
    if (!pageName || !/研究ノート/.test(pageName) || !userName) return;
    if (!isMyResearchNotePage(pageName, userName)) return;

    const calendarPanel = document.getElementById(CALENDAR_ID);
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
        location.assign(buildCreateNoteUrl(currentProjectName, targetPage, body));
    };

    box.appendChild(btn);
    calendarPanel.prepend(box);
};
