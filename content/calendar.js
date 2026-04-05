/* ================= 研究ノート：月カレンダー ================= */
let calendarExpanded = false;

const heatLevel = (count) =>
    count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;

const applyHeatmapToCell = (cell) => {
    cell.classList.remove('sb-cal-cell--heat1', 'sb-cal-cell--heat2', 'sb-cal-cell--heat3', 'sb-cal-cell--heat4');
    const level = heatLevel(Number(cell.dataset.count || 0));
    if (level > 0) cell.classList.add(`sb-cal-cell--heat${level}`);
};

const applyCalendarLayout = async (panelNode, gridNode) => {
    const settings = await loadSettings(currentProjectName);

    if (calendarExpanded) {
        panelNode.className = 'sb-panel sb-panel-calendar sb-panel-calendar-expanded';
        panelNode.style.width = '';
        panelNode.style.height = '';
        panelNode.style.maxHeight = '';
        gridNode.className = CALENDAR_GRID_CLASS + ' sb-cal-grid sb-cal-grid--expanded';
        document.getElementById(TODO_PANEL_ID)?.style.setProperty('display', 'none');
    } else {
        panelNode.className = 'sb-panel sb-panel-calendar';
        gridNode.className = CALENDAR_GRID_CLASS + ' sb-cal-grid';
        applyPanelSettings(panelNode, 'calendar');
        const todo = document.getElementById(TODO_PANEL_ID);
        if (todo) todo.style.removeProperty('display');
    }

    const root = document.documentElement;
    root.style.setProperty('--sb-calFontSize', settings.calendarFontSize + 'px');
    root.style.setProperty('--sb-calFontSizeExpanded', settings.calendarFontSizeExpanded + 'px');
};

const shiftMonthInPageName = (pageName, offset) => {
    const m = pageName.match(/(20\d{2})\.(\d{2})/);
    if (!m) return null;
    let y = +m[1], mo = +m[2] + offset;
    if (mo === 0) { y--; mo = 12; }
    if (mo === 13) { y++; mo = 1; }
    return pageName.replace(/20\d{2}\.\d{2}/, `${y}.${String(mo).padStart(2, '0')}`);
};

const todayPage = (pageName) =>
    pageName.replace(/20\d{2}\.\d{2}/, formatYm(new Date()));

const findTodayLine = (lines) => {
    const today = formatYmd(new Date());
    return lines.find(line => typeof line.text === 'string' && line.text.includes(today));
};

/* ========== パネル生成 ========== */
const createCalendarPanel = (pageName) => {
    const panelNode = document.createElement('div');
    panelNode.className = 'sb-panel sb-panel-calendar';
    applyPanelSettings(panelNode, 'calendar');

    const ym = pageName.match(/(20\d{2})\.(\d{2})/);

    const headerNode = document.createElement('div');
    headerNode.className = 'sb-cal-header';

    const gridNode = document.createElement('div');
    gridNode.className = CALENDAR_GRID_CLASS + ' sb-cal-grid';

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(w => {
        const node = document.createElement('div');
        node.textContent = w;
        node.className = 'sb-cal-weekday' +
            (w === 'Sun' ? ' sb-cal-weekday--sun' : '') +
            (w === 'Sat' ? ' sb-cal-weekday--sat' : '');
        gridNode.appendChild(node);
    });

    applyCalendarLayout(panelNode, gridNode);

    const toggleBtn = createButton('[拡大]', () => {
        calendarExpanded = !calendarExpanded;
        applyCalendarLayout(panelNode, gridNode);
        toggleBtn.textContent = calendarExpanded ? '[縮小]' : '[拡大]';
    });

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
        Object.assign(document.createElement('span'), { className: 'sb-flex-spacer' }),
        createButton('[今月へ]', () => {
            const np = todayPage(pageName);
            if (np) location.assign(`/${currentProjectName}/${encodeURIComponent(np)}`);
        }),
        toggleBtn,
        createButton('✕', () => {
            closedPanels.add(CALENDAR_ID);
            panelNode.remove();
            document.getElementById(TODO_PANEL_ID)?.style.removeProperty('display');
        })
    );

    panelNode.append(headerNode, gridNode);
    document.body.appendChild(panelNode);
    return panelNode;
};

const renderCalendar = (pageName) => {
    getOrCreatePanel(CALENDAR_ID, () => createCalendarPanel(pageName));
};

/* ========== カレンダーデータ描画 ========== */
const renderCalendarFromLines = (pageName, json) => {
    const panelNode = document.getElementById(CALENDAR_ID);
    if (!panelNode) return;

    const gridNode = panelNode.querySelector('.' + CALENDAR_GRID_CLASS);
    if (!gridNode) return;

    while (gridNode.children.length > 7) gridNode.removeChild(gridNode.lastChild);

    if (countDateHeaders(json.lines) > 0) removeResearchNoteCreateUI();

    const { days, snippets } = parseCalendarData(json.lines);
    const today = formatYmd(new Date());
    const ds = Object.keys(days).sort();

    if (ds.length) {
        const f = new Date(ds[0].replace(/\./g, '-')).getDay();
        for (let i = 0; i < f; i++) gridNode.appendChild(document.createElement('div'));
    }

    ds.forEach(d => {
        const dateObj = new Date(d.replace(/\./g, '-'));
        const weekday = dateObj.getDay();
        const dayNum = d.split('.').pop();

        const c = document.createElement('div');
        c.className = 'sb-cal-cell' +
            (d === today ? ' sb-cal-cell--today' : '') +
            (weekday === 0 ? ' sb-cal-cell--sun' : '') +
            (weekday === 6 ? ' sb-cal-cell--sat' : '');

        const dd = document.createElement('div');
        dd.textContent = dayNum;
        dd.className = 'sb-cal-day';
        c.appendChild(dd);

        (snippets[d] || []).forEach(t => {
            const p = document.createElement('div');
            p.textContent = t;
            p.className = 'sb-cal-snippet';
            c.appendChild(p);
        });

        c.dataset.dayCell = '1';
        c.dataset.count = String(snippets[d]?.length || 0);
        c.onclick = () => jumpToLineId(days[d]);
        gridNode.appendChild(c);
    });

    /* ヒートマップ適用 */
    loadSettings(currentProjectName).then(settings => {
        if (settings.calendarHeatmap) {
            gridNode.querySelectorAll('[data-day-cell]').forEach(applyHeatmapToCell);
        }

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
