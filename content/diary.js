/* ================= 研究ノート：週間ダイアリービュー ================= */
/* 1週間分の研究ノート内容を、週間プランナー風（縦7日ストリップ）にレンダリングする。
   月内の前後週へページめくりナビゲーション。今日の行クリックで Scrapbox の該当行へジャンプ。 */

let _diaryDays = {};        // { 'YYYY-MM-DD': line[] }
let _diaryWeekStart = null; // 表示中の週の月曜日 (Date)
let _diaryMonthStart = null;
let _diaryMonthEnd = null;
let _diaryEscHandler = null;

const _formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

/* ページの行データを日付ごとに分割する。
   日付ヘッダ `[*( YYYY.MM.DD ...)]` を境界とする */
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

/* 月の最終日を返す */
const _lastDayOfMonth = (year, month1based) => new Date(year, month1based, 0);

/* 週がページの月内にどれだけ含まれるか判定（前後週ボタンの有効/無効に使う） */
const _weekHasInMonth = (weekStart) => {
    if (!_diaryMonthStart || !_diaryMonthEnd) return true;
    const weekEnd = _addDays(weekStart, 6);
    return weekEnd >= _diaryMonthStart && weekStart <= _diaryMonthEnd;
};

/* ダイアリーモーダルを開く（research_note ページの研究ノート行データを渡す） */
const openDiary = (rawLines, pageName) => {
    _diaryDays = _parseDiaryByDay(rawLines);

    /* pageName から年月を拾って月境界を決める（無ければ範囲制限なし） */
    const m = pageName?.match(/(20\d{2})\.(\d{2})/);
    if (m) {
        const y = +m[1], mo = +m[2];
        _diaryMonthStart = new Date(y, mo - 1, 1);
        _diaryMonthStart.setHours(0, 0, 0, 0);
        _diaryMonthEnd = _lastDayOfMonth(y, mo);
        _diaryMonthEnd.setHours(23, 59, 59, 999);
    } else {
        _diaryMonthStart = null;
        _diaryMonthEnd = null;
    }

    /* 初期週: 今日が月内ならその週、外なら月の第1週 */
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const inMonth = _diaryMonthStart && today >= _diaryMonthStart && today <= _diaryMonthEnd;
    _diaryWeekStart = _startOfWeekMonday(inMonth ? today : (_diaryMonthStart || today));

    _renderDiary();
};

const closeDiary = () => {
    document.getElementById(DIARY_MODAL_ID)?.remove();
    if (_diaryEscHandler) {
        document.removeEventListener('keydown', _diaryEscHandler);
        _diaryEscHandler = null;
    }
};

const _renderDiary = () => {
    document.getElementById(DIARY_MODAL_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = DIARY_MODAL_ID;
    overlay.className = 'sb-diary-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeDiary(); };

    const modal = document.createElement('div');
    modal.className = 'sb-diary-modal';
    modal.onclick = (e) => e.stopPropagation();

    /* 閉じるボタン（コーナー） */
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.className = 'sb-diary-close';
    closeBtn.title = '閉じる (Esc)';
    closeBtn.onclick = closeDiary;
    modal.appendChild(closeBtn);

    /* ヘッダー（週タイトル + 前後週ナビ） */
    const header = document.createElement('div');
    header.className = 'sb-diary-header';

    const prevWeekStart = _addDays(_diaryWeekStart, -7);
    const nextWeekStart = _addDays(_diaryWeekStart, 7);
    const prevAvailable = _weekHasInMonth(prevWeekStart);
    const nextAvailable = _weekHasInMonth(nextWeekStart);

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ 前週';
    prevBtn.className = 'sb-diary-nav-btn' + (prevAvailable ? '' : ' sb-diary-nav-btn--disabled');
    prevBtn.onclick = () => {
        if (!prevAvailable) return;
        _diaryWeekStart = prevWeekStart;
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
    nextBtn.className = 'sb-diary-nav-btn' + (nextAvailable ? '' : ' sb-diary-nav-btn--disabled');
    nextBtn.onclick = () => {
        if (!nextAvailable) return;
        _diaryWeekStart = nextWeekStart;
        _renderDiary();
    };

    header.append(prevBtn, title, nextBtn);
    modal.appendChild(header);

    /* 本体: 7日縦ストリップ */
    const pages = document.createElement('div');
    pages.className = 'sb-diary-pages';

    const todayKey = _formatDateKey(new Date());
    const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
        const d = _addDays(_diaryWeekStart, i);
        const dateKey = _formatDateKey(d);
        const dayLines = _diaryDays[dateKey] || [];
        const dayOfWeek = d.getDay();
        const isToday = dateKey === todayKey;
        const inMonth = !_diaryMonthStart || (d >= _diaryMonthStart && d <= _diaryMonthEnd);

        const dayBlock = document.createElement('div');
        dayBlock.className = 'sb-diary-day' +
            (dayOfWeek === 0 ? ' sb-diary-day--sun' : '') +
            (dayOfWeek === 6 ? ' sb-diary-day--sat' : '') +
            (isToday ? ' sb-diary-day--today' : '') +
            (inMonth ? '' : ' sb-diary-day--outside');

        /* 左: 日付ボックス */
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

        /* 右: コンテンツ */
        const content = document.createElement('div');
        content.className = 'sb-diary-content';

        if (!inMonth) {
            const off = document.createElement('div');
            off.textContent = '(月外)';
            off.className = 'sb-diary-empty';
            content.appendChild(off);
        } else if (dayLines.length === 0) {
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
                node.textContent = t;
                node.title = '元の行へジャンプ';
                node.onclick = () => { closeDiary(); jumpToLineId(line.id); };
                content.appendChild(node);
            });
        }

        dayBlock.append(dateBox, content);
        pages.appendChild(dayBlock);
    }

    modal.appendChild(pages);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    /* ESCで閉じる */
    if (_diaryEscHandler) document.removeEventListener('keydown', _diaryEscHandler);
    _diaryEscHandler = (e) => { if (e.key === 'Escape') closeDiary(); };
    document.addEventListener('keydown', _diaryEscHandler);
};
