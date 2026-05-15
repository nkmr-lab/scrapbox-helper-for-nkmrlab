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

/* 日付フォーマットは parser.js の formatYmd / formatYm を共有。
   _diaryDays のキーは 'YYYY.MM.DD' 形式（formatYmd と一致）。 */

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

/* Scrapboxの画像並べ記法: 行全体が `[| [url][url][url]...]` 形式 */
const _IMG_ROW_RE = /^\[\|\s+(.+)\]\s*$/;

/* テキスト中の [...] を parseSbBracket で解釈して描画する:
   - image → <img>
   - bold → <strong>
   - plain → テキスト（ラベル/リンク先テキスト/装飾外しの中身）
   先頭が `[| [url][url]...]` の画像並べ記法なら横並びの画像グリッドにする。 */
const _renderLineWithImages = (text, parentNode) => {
    /* 画像並べ記法（行全体） */
    const rowMatch = text.trim().match(_IMG_ROW_RE);
    if (rowMatch) {
        const items = [...rowMatch[1].matchAll(/\[([^\]]+)\]/g)];
        const urls = items.map(m => parseSbBracket(m[1]))
            .filter(p => p.type === 'image').map(p => p.url);
        if (urls.length) {
            const row = document.createElement('div');
            row.className = 'sb-diary-img-row';
            urls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'sb-diary-img sb-diary-img--row';
                img.loading = 'lazy';
                row.appendChild(img);
            });
            parentNode.appendChild(row);
            return true;
        }
    }

    /* 通常: 各 [...] を解釈して描画 */
    const re = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let m;
    let hasImg = false;
    while ((m = re.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index);
        if (before) parentNode.appendChild(document.createTextNode(before));

        const parsed = parseSbBracket(m[1]);
        if (parsed.type === 'image') {
            const img = document.createElement('img');
            img.src = parsed.url;
            img.className = 'sb-diary-img';
            img.loading = 'lazy';
            parentNode.appendChild(img);
            hasImg = true;
        } else if (parsed.type === 'bold') {
            const s = document.createElement('strong');
            s.textContent = parsed.text;
            s.className = 'sb-diary-bold';
            parentNode.appendChild(s);
        } else {
            parentNode.appendChild(document.createTextNode(parsed.text));
        }
        lastIndex = m.index + m[0].length;
    }
    const tail = text.slice(lastIndex);
    if (tail) parentNode.appendChild(document.createTextNode(tail));
    return hasImg;
};

/* ページの行データを日付ごとに分割する。日付ヘッダ `[*( YYYY.MM.DD ...)]` を境界とする。
   同じ日付ヘッダが複数回出てきた場合も上書きせず追記する（研究ノート内で重複定義されるケース対応） */
const _parseDiaryByDay = (rawLines) => {
    const byDay = {};
    let curKey = null;
    for (const line of rawLines) {
        const text = (line.text || '').trim();
        const m = text.match(DATE_HEADER_RE);
        if (m) {
            curKey = `${m[1]}.${m[2]}.${m[3]}`;
            if (!byDay[curKey]) byDay[curKey] = [];
            continue;
        }
        if (curKey && line.text) byDay[curKey].push(line);
    }
    return byDay;
};

/* 指定月のデータをキャッシュから返す。なければfetchして格納（並行fetchは1本にまとめる） */
const _loadMonthData = async (ym) => {
    if (_diaryMonthCache[ym]) return _diaryMonthCache[ym];
    if (_diaryFetchInflight[ym]) return _diaryFetchInflight[ym];
    if (!_diaryBasePageName) return {};

    _diaryFetchInflight[ym] = (async () => {
        const pageName = pageNameWithYM(_diaryBasePageName, ym);
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
        monthsNeeded.add(formatYm(_addDays(_diaryWeekStart, i)));
    }
    const merged = {};
    await Promise.all([...monthsNeeded].map(async ym => {
        const data = await _loadMonthData(ym);
        Object.assign(merged, data);
    }));
    _diaryDays = merged;
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
    const d = _addDays(weekStart, i);
    const dateKey = formatYmd(d);
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
    dayWk.textContent = WEEKDAY_JA[dayOfWeek];
    dayWk.className = 'sb-diary-day-wk-ja';

    const dayWkEn = document.createElement('div');
    dayWkEn.textContent = WEEKDAY_EN[dayOfWeek];
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
                const lineYM = formatYm(d);
                const baseYM = _diaryBasePageName?.match(/(20\d{2}\.\d{2})/)?.[1];
                if (baseYM && lineYM !== baseYM) {
                    const newPage = pageNameWithYM(_diaryBasePageName, lineYM);
                    closeDiary();
                    navigateToPage(newPage, line.id);
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
    const titleText = `${_diaryWeekStart.getFullYear()}年 ${_diaryWeekStart.getMonth() + 1}月${_diaryWeekStart.getDate()}日 ～ ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
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

    const todayKey = formatYmd(new Date());

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
};
