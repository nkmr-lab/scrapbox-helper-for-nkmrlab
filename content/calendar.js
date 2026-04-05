/* ================= 研究ノート：月カレンダー ================= */
let calendarExpanded = false;

const applyTodayStyle = (cellNode) => {
    cellNode.style.boxShadow = `inset 0 0 0 2px ${Theme.calToday}`;
};

const applyWeekdayStyle = (cellNode) => {
    if (cellNode.dataset.weekday === 'sun') {
        cellNode.style.color = Theme.calSunday;
    } else if (cellNode.dataset.weekday === 'sat') {
        cellNode.style.color = Theme.calSaturday;
    } else {
        cellNode.style.color = '';
    }
};

const renderWeekdayRow = (gridNode) => {
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(w => {
        const node = appendTextNode(gridNode, w, 'font-weight:bold;text-align:center;');
        if (w === 'Sun') node.style.color = Theme.calSundayHeader;
        if (w === 'Sat') node.style.color = Theme.calSaturdayHeader;
    });
};

/* ========== Heatmap ========== */
const getHeatmapColors = () => [
    'transparent',
    Theme.heatmap1,
    Theme.heatmap2,
    Theme.heatmap3,
    Theme.heatmap4,
];

const applyHeatmap = (cellNode, count) => {
    const level =
        count === 0 ? 0 :
        count <= 2 ? 1 :
        count <= 5 ? 2 :
        count <= 10 ? 3 : 4;

    cellNode.style.background = getHeatmapColors()[level];
    applyWeekdayStyle(cellNode);
};

const applyCalendarLayout = async (panelNode, gridNode) => {
    const settings = await loadSettings(currentProjectName);

    if (calendarExpanded) {
        applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar, Styles.panelCalendarExpanded);
        applyStyle(gridNode, Styles.calendar.grid, Styles.calendar.gridExpanded);
        document.getElementById(TODO_PANEL_ID)?.style.setProperty('display', 'none');
    } else {
        applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar);
        applyStyle(gridNode, Styles.calendar.grid);
        applyPanelSettings(panelNode, 'calendar');
        const todo = document.getElementById(TODO_PANEL_ID);
        if (todo) todo.style.removeProperty('display');
    }

    gridNode.style.fontSize = settings.calendarFontSize + 'px';
};

/* ========== 月の移動 ========== */
const shiftMonthInPageName = (pageName, offset) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;
    let y = +m[1], mo = +m[2] + offset;
    if (mo === 0) { y--; mo = 12; }
    if (mo === 13) { y++; mo = 1; }
    return pageName.replace(/20\d{2}\.\d{2}/, `${y}.${String(mo).padStart(2, '0')}`);
};

const todayPage = (pageName) => {
    return pageName.replace(/20\d{2}\.\d{2}/, formatYm(new Date()));
};

const findTodayLine = (lines) => {
    const today = formatYmd(new Date());
    return lines.find(line =>
        typeof line.text === 'string' && line.text.includes(today)
    );
};

/* ========== パネル生成 ========== */
const createCalendarPanel = (pageName) => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base, Styles.panelCalendar);
    applyPanelSettings(panelNode, 'calendar');

    const ym = pageName.match(/(20\d{2})\.(\d{2})/);

    /* Header */
    const headerNode = document.createElement('div');
    applyStyle(headerNode, Styles.calendar.header);

    /* Grid */
    const gridNode = document.createElement('div');
    gridNode.className = CALENDAR_GRID_CLASS;
    renderWeekdayRow(gridNode);
    applyCalendarLayout(panelNode, gridNode);

    /* Expand toggle */
    const toggleBtn = createButton('[拡大]', () => {
        calendarExpanded = !calendarExpanded;
        applyCalendarLayout(panelNode, gridNode);
        toggleBtn.textContent = calendarExpanded ? '[縮小]' : '[拡大]';

        gridNode.querySelectorAll('[data-day-cell]').forEach(c => {
            if (calendarExpanded) {
                applyHeatmap(c, Number(c.dataset.count || 0));
            } else {
                c.style.background = '';
            }
        });
    });

    /* Header 組み立て */
    headerNode.append(
        createButton('◀', () => {
            const np = shiftMonthInPageName(pageName, -1);
            if (np) location.assign(`/${currentProjectName}/${encodeURIComponent(np)}`);
        }),
        document.createTextNode(ym ? `${ym[1]}年${parseInt(ym[2], 10)}月` : ''),
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
            document.getElementById(TODO_PANEL_ID)?.style.removeProperty('display');
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

/* ========== カレンダーデータ描画 ========== */
const renderCalendarFromLines = (pageName, json) => {
    const panelNode = document.getElementById(CALENDAR_ID);
    if (!panelNode) return;

    const gridNode = panelNode.querySelector('.' + CALENDAR_GRID_CLASS);
    if (!gridNode) return;

    while (gridNode.children.length > 7) {
        gridNode.removeChild(gridNode.lastChild);
    }

    if (countDateHeaders(json.lines) > 0) {
        removeResearchNoteCreateUI();
    }

    const days = {}, snip = {};
    let cur = null;
    let year, month, day;

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
            cur && text &&
            !text.startsWith('#') &&
            !text.startsWith('>') &&
            !text.startsWith('[https://') &&
            !text.startsWith('[[https://') &&
            !text.startsWith('[| ') &&
            snip[cur].length < CALENDAR_SNIPPET_LIMIT
        ) {
            snip[cur].push(text);
        }
    }

    const today = formatYmd(new Date());

    const ds = Object.keys(days).sort();
    if (ds.length) {
        const f = new Date(ds[0].replace(/\./g, '-')).getDay();
        for (let i = 0; i < f; i++) {
            gridNode.appendChild(document.createElement('div'));
        }
    }

    ds.forEach(d => {
        const c = document.createElement('div');
        c.style = `border:1px solid ${Theme.calCellBorder};padding:2px;cursor:pointer;display:flex;flex-direction:column;gap:2px;overflow:hidden;min-height:0`;

        const dd = document.createElement('div');
        dd.textContent = d.split('.').pop();
        day = d.split('.').pop();
        dd.style = 'font-weight:bold;line-height:1';
        c.appendChild(dd);

        (snip[d] || []).forEach(t => {
            const p = document.createElement('div');
            p.textContent = t;
            p.style = `font-size:0.9em;color:${Theme.calSnippet};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;`;
            c.appendChild(p);
        });

        c.dataset.dayCell = '1';
        c.dataset.count = String(snip[d]?.length || 0);

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

    loadSettings(currentProjectName).then(settings => {
        if (!isMyThisMonthResearchNote(pageName, settings.userName)) return;
        if (location.hash) return;

        if (!window.__jumpedToTodayInNote) {
            const todayLine = findTodayLine(json.lines);
            if (todayLine) {
                window.__jumpedToTodayInNote = true;
                requestAnimationFrame(() => jumpToLineId(todayLine.id));
            }
        }
    });
};
