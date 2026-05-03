/* ================= 研究ノート：週間ダイアリービュー ================= */
/* 1週間分の研究ノート内容を、見開き2ページ（左=月火水 / 右=木金土日）の紙ノート風モーダルで表示する。
   月跨ぎの週は前後月のノートも自動でフェッチして合成。
   週の全7日が現在開いている Scrapbox ページの月と完全に違うなら、Scrapbox 側もその月の研究ノートに自動遷移する。 */

let _diaryBasePageName = null;  // Scrapbox上の基準ページ名（月の自動遷移時に更新）
let _diaryWeekStart = null;     // 表示中の週の月曜日 (Date)
let _diaryDays = {};            // 表示中の週に必要な全月データのマージ { 'YYYY-MM-DD': line[] }
let _diaryMonthCache = {};      // { 'YYYY.MM': { 'YYYY-MM-DD': line[] } }
let _diaryFetchInflight = {};   // 同月への並行fetch重複を抑える { 'YYYY.MM': Promise }
let _diaryEscHandler = null;

const _formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const _formatYM = (date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

const _addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
};

/* ISO風: 月曜始まり。日曜は前の月曜へ寄せる */
const _startOfWeekMonday = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
};

const _lastDayOfMonth = (year, month1based) => new Date(year, month1based, 0);

/* --- 画像URL判定（Scrapbox記法 [url] の中身用） --- */
const _IMG_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i;
const _GYAZO_PAGE_RE = /^https?:\/\/(?:www\.)?gyazo\.com\/([a-z0-9]+)(?:\/.*)?$/i;

const _toImageUrl = (raw) => {
    const url = raw.trim();
    const g = url.match(_GYAZO_PAGE_RE);
    if (g) return `https://i.gyazo.com/${g[1]}.png`;
    if (_IMG_URL_RE.test(url)) return url;
    return null;
};

/* テキスト中の [url] を画像なら <img>、そうでなければ元の表記で展開する */
const _renderLineWithImages = (text, parentNode) => {
    const re = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let m;
    let hasImg = false;
    while ((m = re.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index);
        if (before) parentNode.appendChild(document.createTextNode(before));

        const imgUrl = _toImageUrl(m[1]);
        if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'sb-diary-img';
            img.loading = 'lazy';
            parentNode.appendChild(img);
            hasImg = true;
        } else {
            parentNode.appendChild(document.createTextNode(m[0]));
        }
        lastIndex = m.index + m[0].length;
    }
    const tail = text.slice(lastIndex);
    if (tail) parentNode.appendChild(document.createTextNode(tail));
    return hasImg;
};

/* ページの行データを日付ごとに分割する。日付ヘッダ `[*( YYYY.MM.DD ...)]` を境界とする */
const _parseDiaryByDay = (rawLines) => {
    const byDay = {};
    let curKey = null;
    for (const line of rawLines) {
        const text = (line.text || '').trim();
        const m = text.match(/^\[\*\(\s*(20\d{2})\.(\d{2})\.(\d{2})/);
        if (m) {
            curKey = `${m[1]}-${m[2]}-${m[3]}`;
            byDay[curKey] = [];
            continue;
        }
        if (curKey && line.text) byDay[curKey].push(line);
    }
    return byDay;
};

/* 基準pageNameの YYYY.MM 部分を ym に置換した新しいpageNameを返す */
const _pageNameForMonth = (basePageName, ym) =>
    basePageName.replace(/20\d{2}\.\d{2}/, ym);

/* 指定月のデータをキャッシュから返す。なければfetchして格納（並行fetchは1本にまとめる） */
const _loadMonthData = async (ym) => {
    if (_diaryMonthCache[ym]) return _diaryMonthCache[ym];
    if (_diaryFetchInflight[ym]) return _diaryFetchInflight[ym];
    if (!_diaryBasePageName) return {};

    _diaryFetchInflight[ym] = (async () => {
        const pageName = _pageNameForMonth(_diaryBasePageName, ym);
        const json = await fetchPage(currentProjectName, pageName);
        const byDay = json ? _parseDiaryByDay(json.lines) : {};
        _diaryMonthCache[ym] = byDay;
        delete _diaryFetchInflight[ym];
        return byDay;
    })();
    return _diaryFetchInflight[ym];
};

/* 表示中の週に必要な全月データを fetch+merge して _diaryDays をセット */
const _ensureWeekData = async () => {
    const monthsNeeded = new Set();
    for (let i = 0; i < 7; i++) {
        monthsNeeded.add(_formatYM(_addDays(_diaryWeekStart, i)));
    }
    const merged = {};
    await Promise.all([...monthsNeeded].map(async ym => {
        const data = await _loadMonthData(ym);
        Object.assign(merged, data);
    }));
    _diaryDays = merged;
};

/* 表示中の週の全7日が現在の基準月と完全に違うなら Scrapbox を該当月の研究ノートへ遷移する */
const _maybeNavigateScrapbox = () => {
    if (!_diaryBasePageName) return;
    const baseYM = _diaryBasePageName.match(/(20\d{2}\.\d{2})/)?.[1];
    if (!baseYM) return;

    const monthsInWeek = new Set();
    for (let i = 0; i < 7; i++) {
        monthsInWeek.add(_formatYM(_addDays(_diaryWeekStart, i)));
    }
    if (monthsInWeek.size !== 1) return;
    const wkYM = [...monthsInWeek][0];
    if (wkYM === baseYM) return;

    const newPageName = _pageNameForMonth(_diaryBasePageName, wkYM);
    _diaryBasePageName = newPageName;  // 以降のfetchも新基準で
    location.assign(`/${currentProjectName}/${encodeURIComponent(newPageName)}`);
};

/* ダイアリーモーダルを開く */
const openDiary = async (rawLines, pageName) => {
    _diaryBasePageName = pageName;
    _diaryMonthCache = {};
    _diaryFetchInflight = {};

    /* 現在ページの月データをパース済みでキャッシュにプライム（即時表示用） */
    const m = pageName?.match(/(20\d{2})\.(\d{2})/);
    if (m) {
        const ym = `${m[1]}.${m[2]}`;
        _diaryMonthCache[ym] = _parseDiaryByDay(rawLines);
    }

    /* 初期週: 今日が当該月内なら今日の週、外なら月の第1週 */
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let initBase = today;
    if (m) {
        const y = +m[1], mo = +m[2];
        const monthStart = new Date(y, mo - 1, 1);
        const monthEnd = _lastDayOfMonth(y, mo); monthEnd.setHours(23, 59, 59, 999);
        const inMonth = today >= monthStart && today <= monthEnd;
        initBase = inMonth ? today : monthStart;
    }
    _diaryWeekStart = _startOfWeekMonday(initBase);

    await _renderDiary();
};

const closeDiary = () => {
    document.getElementById(DIARY_MODAL_ID)?.remove();
    if (_diaryEscHandler) {
        document.removeEventListener('keydown', _diaryEscHandler);
        _diaryEscHandler = null;
    }
};

/* 1日分の日付ボックス+コンテンツのDOMを生成する */
const _buildDayBlock = (weekStart, i, todayKey) => {
    const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const d = _addDays(weekStart, i);
    const dateKey = _formatDateKey(d);
    const dayLines = _diaryDays[dateKey] || [];
    const dayOfWeek = d.getDay();
    const isToday = dateKey === todayKey;

    const dayBlock = document.createElement('div');
    dayBlock.className = 'sb-diary-day' +
        (dayOfWeek === 0 ? ' sb-diary-day--sun' : '') +
        (dayOfWeek === 6 ? ' sb-diary-day--sat' : '') +
        (isToday ? ' sb-diary-day--today' : '');

    const dateBox = document.createElement('div');
    dateBox.className = 'sb-diary-date-box';

    const dayNum = document.createElement('div');
    dayNum.textContent = String(d.getDate());
    dayNum.className = 'sb-diary-day-num';

    const dayWk = document.createElement('div');
    dayWk.textContent = weekdayJa[dayOfWeek];
    dayWk.className = 'sb-diary-day-wk-ja';

    const dayWkEn = document.createElement('div');
    dayWkEn.textContent = weekdayEn[dayOfWeek];
    dayWkEn.className = 'sb-diary-day-wk-en';

    dateBox.append(dayNum, dayWk, dayWkEn);

    const content = document.createElement('div');
    content.className = 'sb-diary-content';

    if (dayLines.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = '—';
        empty.className = 'sb-diary-empty';
        content.appendChild(empty);
    } else {
        dayLines.forEach(line => {
            const t = (line.text || '').trim();
            if (!t) return;
            const node = document.createElement('div');
            node.className = 'sb-diary-line';
            const hasImg = _renderLineWithImages(t, node);
            if (hasImg) node.classList.add('sb-diary-line--has-img');
            node.title = '元の行へジャンプ';
            node.onclick = () => {
                /* ページが違えばまずそちらへ移動してからジャンプ */
                const lineYM = _formatYM(d);
                const baseYM = _diaryBasePageName?.match(/(20\d{2}\.\d{2})/)?.[1];
                if (baseYM && lineYM !== baseYM) {
                    const newPage = _pageNameForMonth(_diaryBasePageName, lineYM);
                    closeDiary();
                    location.assign(`/${currentProjectName}/${encodeURIComponent(newPage)}#${line.id}`);
                } else {
                    closeDiary();
                    jumpToLineId(line.id);
                }
            };
            content.appendChild(node);
        });
    }

    dayBlock.append(dateBox, content);
    return dayBlock;
};

const _renderDiary = async () => {
    /* 必要月のデータを揃える */
    await _ensureWeekData();

    document.getElementById(DIARY_MODAL_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = DIARY_MODAL_ID;
    overlay.className = 'sb-diary-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeDiary(); };

    const modal = document.createElement('div');
    modal.className = 'sb-diary-modal';
    modal.onclick = (e) => e.stopPropagation();

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.className = 'sb-diary-close';
    closeBtn.title = '閉じる (Esc)';
    closeBtn.onclick = closeDiary;
    modal.appendChild(closeBtn);

    /* ヘッダー（週タイトル + 前後週ナビ） */
    const header = document.createElement('div');
    header.className = 'sb-diary-header';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ 前週';
    prevBtn.className = 'sb-diary-nav-btn';
    prevBtn.onclick = () => {
        _diaryWeekStart = _addDays(_diaryWeekStart, -7);
        _renderDiary();
    };

    const weekEnd = _addDays(_diaryWeekStart, 6);
    const sameMonth = _diaryWeekStart.getMonth() === weekEnd.getMonth();
    const titleText = sameMonth
        ? `${_diaryWeekStart.getFullYear()}年 ${_diaryWeekStart.getMonth() + 1}月 ${_diaryWeekStart.getDate()}日 — ${weekEnd.getDate()}日`
        : `${_diaryWeekStart.getFullYear()}年 ${_diaryWeekStart.getMonth() + 1}/${_diaryWeekStart.getDate()} — ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
    const title = document.createElement('div');
    title.className = 'sb-diary-week-title';
    title.textContent = titleText;

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '次週 ▶';
    nextBtn.className = 'sb-diary-nav-btn';
    nextBtn.onclick = () => {
        _diaryWeekStart = _addDays(_diaryWeekStart, 7);
        _renderDiary();
    };

    header.append(prevBtn, title, nextBtn);
    modal.appendChild(header);

    /* 本体: 見開き2ページ（左=月火水 / 右=木金土日） */
    const spread = document.createElement('div');
    spread.className = 'sb-diary-spread';

    const leftPage = document.createElement('div');
    leftPage.className = 'sb-diary-page sb-diary-page--left';
    const rightPage = document.createElement('div');
    rightPage.className = 'sb-diary-page sb-diary-page--right';

    const todayKey = _formatDateKey(new Date());

    [0, 1, 2].forEach(i => leftPage.appendChild(_buildDayBlock(_diaryWeekStart, i, todayKey)));
    [3, 4, 5, 6].forEach(i => rightPage.appendChild(_buildDayBlock(_diaryWeekStart, i, todayKey)));

    spread.append(leftPage, rightPage);
    modal.appendChild(spread);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    /* ESCで閉じる */
    if (_diaryEscHandler) document.removeEventListener('keydown', _diaryEscHandler);
    _diaryEscHandler = (e) => { if (e.key === 'Escape') closeDiary(); };
    document.addEventListener('keydown', _diaryEscHandler);

    /* 全7日が違う月になったら Scrapbox 側もその月へ遷移（描画後に走らせる） */
    _maybeNavigateScrapbox();
};
