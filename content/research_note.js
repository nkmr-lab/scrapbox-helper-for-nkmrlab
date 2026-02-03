/* ================= 研究ノート：月カレンダー（完全版） ================= */
let calendarExpanded = false;

const applyTodayStyle = (cellNode) => {
    cellNode.style.boxShadow = 'inset 0 0 0 2px rgba(255,0,0,1)';
};

const applyWeekdayStyle = (cellNode) => {
    if (cellNode.dataset.weekday === 'sun') {
        cellNode.style.color = '#c00';   // 赤
    } else if (cellNode.dataset.weekday === 'sat') {
        cellNode.style.color = '#06c';   // 青
    } else {
        cellNode.style.color = '';
    }
};

/* ========== 曜日行 ========== */
const renderWeekdayRow = (gridNode) => {
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(w => {
        const node = appendTextNode(
            gridNode,
            w,
            ['font-weight:bold;text-align:center;'].join('')
        );
        if (w === 'Sun') node.style.color = "#f00";
        if (w === 'Sat') node.style.color = "#00f";
    });
};

/* ========== Heatmap 関数 ========== */
const applyHeatmap = (cellNode, count) => {
    //if (!calendarExpanded) return;

    const level =
    count === 0 ? 0 :
    count <= 2 ? 1 :
    count <= 5 ? 2 :
    count <= 10 ? 3 : 4;

    const COLORS = [
        'transparent',
        'rgba(0,150,0,0.10)',
        'rgba(0,150,0,0.20)',
        'rgba(0,150,0,0.35)',
        'rgba(0,150,0,0.55)',
    ];

    cellNode.style.background = COLORS[level];
    applyWeekdayStyle(cellNode);
};

const applyCalendarFontSize = (gridNode) => {
    loadSettings(currentProjectName, settings => {
        gridNode.style.fontSize = settings.calendarFontSize + 'px';
    });
};

const applyCalendarLayout = (panelNode, gridNode) => {
    if (calendarExpanded) {
        applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar, Styles.panelCalendarExpanded);
        applyStyle(gridNode, Styles.calendar.grid, Styles.calendar.gridExpanded);

        // TODO パネルを隠す
        document.getElementById(TODO_PANEL_ID)?.style.setProperty('display', 'none');
    } else {
        applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar);
        applyStyle(gridNode, Styles.calendar.grid);

        // TODO パネルを戻す
        const todo = document.getElementById(TODO_PANEL_ID);
        if (todo) todo.style.removeProperty('display');
    }
    applyCalendarFontSize(gridNode);
};

const shiftMonthInPageName = (pageName, offset) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;
    let y = +m[1], mo = +m[2] + offset;
    if (mo === 0)  { y--; mo = 12; }
    if (mo === 13) { y++; mo = 1; }
    return pageName.replace(/20\d{2}\.\d{2}/, `${y}.${String(mo).padStart(2,'0')}`);
};

const todayPage = (pageName) => {
    const d = new Date();
    return pageName.replace(
        /20\d{2}\.\d{2}/,
        `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`
    );
};

const findTodayLine = (lines) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    const today = `${y}.${m}.${d}`;
    return lines.find(line =>
        typeof line.text === 'string' &&
        line.text.includes(today)
    );
};

const createCalendarPanel = (pageName) => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar);
    applyPanelSettings(panelNode);

    const ym = pageName.match(/(20\d{2})\.(\d{2})/);

    /* ========== Header ========== */
    const headerNode = document.createElement('div');
    applyStyle(headerNode, Styles.calendar.header);

    /* ========== Grid ========== */
    const gridNode = document.createElement('div');
    gridNode.className = CALENDAR_GRID_CLASS;

    renderWeekdayRow(gridNode);
    applyCalendarLayout(panelNode, gridNode);

    /* ========== Expand トグル ========== */
    const toggleBtn = createButton('[拡大]', () => {
        calendarExpanded = !calendarExpanded;
        applyCalendarLayout(panelNode, gridNode);
        toggleBtn.textContent = calendarExpanded ? '[縮小]' : '[拡大]';

        // expanded 切替時に全セルへ再適用
        gridNode.querySelectorAll('[data-day-cell]').forEach(c => {
            if (calendarExpanded) {
                const count = Number(c.dataset.count || 0);
                applyHeatmap(c, count);
            } else {
                c.style.background = '';
                applyPanelSettings(panelNode);
            }
        });
    });

    /* ========== Header 組み立て ========== */
    headerNode.append(
        createButton('◀', () => {
            const np = shiftMonthInPageName(pageName, -1);
            if (np) location.assign(`/${currentProjectName}/${encodeURIComponent(np)}`);
        }),
        document.createTextNode(ym ? `${ym[1]}年${parseInt(ym[2],10)}月` : ''),
        createButton('▶', () => {
            const np = shiftMonthInPageName(pageName, 1);
            if (np) location.assign(`/${currentProjectName}/${encodeURIComponent(np)}`);
        }),
        Object.assign(document.createElement('span'), { style: 'margin-left:auto' }),
        createButton('[今月へ]', () => {
            const np = todayPage(pageName);
            if (np) location.assign(`/${currentProjectName}/${encodeURIComponent(np)}`);
        }),
        toggleBtn,
        createButton('✕', () => {
            closedPanels.add(CALENDAR_ID);
            panelNode.remove();
            document.getElementById(TODO_PANEL_ID)
                ?.style.removeProperty('display');
        }),
        createButton('⚙', () => {
            renderSettingsPanel(panelNode);
        })
    );

    panelNode.append(headerNode, gridNode);
    document.body.appendChild(panelNode);
    return panelNode;
};

const renderCalendar = (pageName) => {
    getOrCreatePanel(
        CALENDAR_ID,
        () => createCalendarPanel(pageName)
    );
};

const renderCalendarFromLines = (pageName, json) => {
    const panelNode = document.getElementById(CALENDAR_ID);
    if (!panelNode) return;

    const gridNode = panelNode.querySelector('.' + CALENDAR_GRID_CLASS);
    if (!gridNode) return;

    // 曜日行（7個）だけ残す
    while (gridNode.children.length > 7) {
        gridNode.removeChild(gridNode.lastChild);
    }

    if (countDateHeaders(json.lines) > 0) {
        creatingResearchNoteFor = null;
        removeResearchNoteCreateUI();
    }

    const days = {}, snip = {};
    let cur = null;

    let year;
    let month;
    let day;
    for (const line of json.lines) {
        let text = (line.text || '').trim();
        const mm = text.match(/^\[[\*\(]+\s*(20\d{2})\.(\d{2})\.(\d{2})/);
        if (mm) {
            cur = `${mm[1]}.${mm[2]}.${mm[3]}`;
            days[cur] = line.id;
            snip[cur] = [];
            year = mm[1];
            month = mm[2];
            continue;
        }

        text = text.replace(/\[[^\]]+\.icon\]/g, '').trim();
        if (
            cur &&
            text &&
            !text.startsWith('#') &&
            !text.startsWith('>') &&
            !text.startsWith('[https://') &&
            !text.startsWith('[[https://') &&
            !text.startsWith('[| ') &&
            snip[cur].length < 10
        ) {
            snip[cur].push(text);
        }
    }

    const today = (() => {
        const date = new Date();
        return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
    })();

    const ds = Object.keys(days).sort();
    if (ds.length) {
        const f = new Date(ds[0].replace(/\./g, '-')).getDay();
        for (let i = 0; i < f; i++) {
            gridNode.appendChild(document.createElement('div'));
        }
    }

    ds.forEach(d => {
        const c = document.createElement('div');
        c.style ='border:1px solid #ddd;padding:2px;cursor:pointer;' + 'display:flex;flex-direction:column;gap:2px;overflow:hidden;min-height: 0';

        /* 日付 */
        const dd = document.createElement('div');
        dd.textContent = d.split('.').pop();
        day = d.split('.').pop();
        dd.style = 'font-weight:bold;line-height:1';
        c.appendChild(dd);

        /* 書き込みリスト */
        (snip[d] || []).forEach(t => {
            const p = document.createElement('div');
            p.textContent = t;
            p.style = 'font-size:0.9em;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;';
            c.appendChild(p);
        });

        /* ====== ここが重要 ====== */
        c.dataset.dayCell = '1';
        c.dataset.count = String(snip[d]?.length || 0);
        /* ======================== */
        if (d === today) {
            c.dataset.today = '1';
            applyTodayStyle(c);
        }

        const dateObj = new Date(year, month - 1, day);
        const weekday = dateObj.getDay();
        if (weekday === 0) c.dataset.weekday = 'sun';
        if (weekday === 6) c.dataset.weekday = 'sat';

        applyWeekdayStyle(c);
        c.onclick = () => jumpToLineId(days[d]);
        gridNode.appendChild(c);
    });

    loadSettings(currentProjectName, settings => {
        if (isMyThisMonthResearchNote(pageName, settings.userName)) {
        if (location.hash) return;

        // 一度だけジャンプするためのフラグ
        if (!window.__jumpedToTodayInNote) {
            const todayLine = findTodayLine(json.lines);
            if (todayLine) {
                window.__jumpedToTodayInNote = true;
                // 描画が落ち着いてから飛ぶ
                requestAnimationFrame(() => jumpToLineId(todayLine.id));
            }
        }
        }
    });
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const generateResearchNoteBody = (date, userName) => {
    const year  = date.getFullYear();
    const month = date.getMonth(); // 0-based
    const ym = `${year}.${String(month + 1).padStart(2, '0')}`;

    const prev = new Date(year, month - 1, 1);
    const next = new Date(year, month + 1, 1);
    const prevYm = `${prev.getFullYear()}.${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const nextYm = `${next.getFullYear()}.${String(next.getMonth() + 1).padStart(2, '0')}`;

    const lastDay = new Date(year, month + 1, 0).getDate();
    let body = `#${prevYm}_研究ノート_${userName} ` + `#${nextYm}_研究ノート_${userName} #研究ノート_${userName}\n\n`;

    for (let d = 1; d <= lastDay; d++) {
        const day = new Date(year, month, d);
        const w   = WEEK_LABELS[day.getDay()];
        const label = `${year}.${String(month + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        body += `[*( ${label} (${w})]\n\n\n`;
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
    const y = +m[1];
    const mo = +m[2];
    const now = new Date();
    return y === now.getFullYear() && mo === now.getMonth() + 1;
};

const buildCreateNoteUrl = (project, pageName, body) => {
    return (`https://scrapbox.io/${project}/${encodeURIComponent(pageName)}` + `?body=${encodeURIComponent(body)}`);
};

const countDateHeaders = (lines) => {
    return lines.filter(line =>
        /^\[\*\(\s*20\d{2}\.\d{2}\.\d{2}/.test(line.text || '')
    ).length;
};

const removeResearchNoteCreateUI = () => {
    document.getElementById(CALENDAR_CREATE_UI_ID)?.remove();
};

const renderResearchNoteCreateUI = ({ settings, pageName, rawLines }) => {
    if (!pageName) return;
    if (!/研究ノート/.test(pageName)) return;
    if (!settings?.userName) return;

    // 自分の研究ノート以外は出さない 
    if (!isMyResearchNotePage(pageName, settings.userName)) return;

    const calendarPanel = document.getElementById(CALENDAR_ID);
    if (!calendarPanel) return;

    // すでに生成済みなら何もしない
    if (countDateHeaders(rawLines) > 0) return;

    // 対象年月を pageName から取得
    const baseDate = extractYearMonthFromPageName(pageName);
    if (!baseDate) return;

    // 二重表示防止
    if (calendarPanel.querySelector('#' + CALENDAR_CREATE_UI_ID)) return;

    const box = document.createElement('div');
    box.id = CALENDAR_CREATE_UI_ID;
    box.style = Styles.calendar.createUI;

    const ym = `${baseDate.getFullYear()}.` + `${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    const msg = document.createElement('div');
    msg.textContent = `⚠ ${ym} の研究ノートがまだ作成されていません`;
    msg.style = 'margin-bottom:6px;color:#555;';
    box.appendChild(msg);

    const btn = document.createElement('button');
    btn.textContent = `${ym} の研究ノートを作成する（作成後に書き込みするとこのボタンは消えます）`;
    btn.onclick = () => {
        const targetPage = `${ym}_研究ノート_${settings.userName}`;
        researchNoteWatcher.stop();

        const body = generateResearchNoteBody(baseDate, settings.userName);
        const url = buildCreateNoteUrl(currentProjectName, targetPage, body);
        removeResearchNoteCreateUI();
        location.assign(url);
    };

    box.appendChild(btn);

    // CALENDAR パネルの上に表示
    calendarPanel.prepend(box);
};

const extractYearMonthFromPageName = (pageName) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;

    const year  = Number(m[1]);
    const month = Number(m[2]) - 1; // JS Date は 0-based
    return new Date(year, month, 1);
};

/* ================= TODO PANEL (stable version) ================= */
const createTodoPanel = () => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base, Styles.panelTodo);
    const calendarPanel = document.getElementById(CALENDAR_ID);
    if (calendarPanel !== null) {
        panelNode.style.right = calendarPanel.offsetWidth + 20 + 'px';
    }
    applyPanelSettings(panelNode);
    return panelNode;
};

const createTodoRow = (todo) => {
    const itemNode = document.createElement('div');
    itemNode.style = 'cursor:pointer;padding:4px 6px;' + 'border-bottom:1px solid #eee;' + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    itemNode.textContent = '□ ' + todo.text + (todo.date ? ` (${todo.date})` : '');

    if (todo.done) {
        itemNode.style.color = '#999';
        itemNode.style.textDecoration = 'line-through';
    }

    itemNode.onclick = () => jumpToLineId(todo.id);
        return itemNode;
};

const extractTodos = (settings, lines) => {
    const todos = [];
    let currentDate = null;

    lines.forEach(line => {
        const text = (line.text || '').trim();
        const dm = text.match(/^\[\*\(\s*(20\d{2})\.(\d{2})\.(\d{2})/);
        if (dm) {
            currentDate = `${dm[1]}.${dm[2]}.${dm[3]}`;
            return;
        }

        if (text.includes(settings.todoMark)) {
            todos.push({ id: line.id, text: text.replace(settings.todoMark, '').trim(), date: currentDate, done: false });
            return;
        }

        if (text.includes(settings.doneMark)) {
        todos.push({ id: line.id, text: text.replace(settings.doneMark, '').trim(), date: currentDate, done: true });
        }
    });

    return todos;
};

const renderTodoPanel = (lines) => {
    loadSettings(currentProjectName, settings => {
        const TODOSHOW = 5;
        const todos = extractTodos(settings, lines);
        if (!todos.length) {
            document.getElementById(TODO_PANEL_ID)?.remove();
            return;
        }

        const panelNode = getOrCreatePanel(TODO_PANEL_ID, createTodoPanel);
        panelNode.innerHTML = '';

        const activeTodos = todos.filter(todo => !todo.done);
        const doneTodos   = todos.filter(todo => todo.done);

        appendPanelTitle(panelNode, `📝 TODO LIST（${activeTodos.length} / ${todos.length}）`);
        attachCloseButton(panelNode, TODO_PANEL_ID);

        const list = document.createElement('div');
        panelNode.appendChild(list);

        const items = [];
        // 表示順をここで固定（未完了 → 完了）
        [...activeTodos, ...doneTodos].forEach(todo => {
            const row = createTodoRow(todo);
            items.push({ dom: row, done: todo.done });
            list.appendChild(row);
        });

        const activeItems = items.filter(x => !x.done);
        const doneItems   = items.filter(x => x.done);

        let moreLine = null;
        const showCollapsed = () => {
            activeItems.forEach((x, i) => { x.dom.style.display = i < TODOSHOW ? '' : 'none'; });
            doneItems.forEach(x => { x.dom.style.display = 'none'; });
            if (moreLine) moreLine.style.display = '';
        };

        const showAll = () => {
            items.forEach(x => { x.dom.style.display = ''; });
            if (moreLine) moreLine.style.display = 'none';
        };
        showCollapsed();

        panelNode.addEventListener('mouseenter', showAll);
        panelNode.addEventListener('mouseleave', showCollapsed);
    });
};