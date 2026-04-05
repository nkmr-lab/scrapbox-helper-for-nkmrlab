/* ================= TODO パネル ================= */

const createTodoRow = (todo) => {
    const itemNode = document.createElement('div');
    itemNode.className = 'sb-todo-row' + (todo.done ? ' sb-todo-row--done' : '');
    itemNode.textContent = '□ ' + todo.text + (todo.date ? ` (${todo.date})` : '');
    itemNode.onclick = () => jumpToLineId(todo.id);
    return itemNode;
};

const extractTodos = (settings, lines) => {
    const todos = [];
    let currentDate = null;

    lines.forEach(line => {
        const text = (line.text || '').trim();
        const dm = text.match(/^\[\*\(\s*(20\d{2})\.(\d{2})\.(\d{2})/);
        if (dm) { currentDate = `${dm[1]}.${dm[2]}.${dm[3]}`; return; }

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

const positionTodoPanel = (panelNode, settings) => {
    const calendarPanel = document.getElementById(CALENDAR_ID);
    if (!calendarPanel) return;

    if (settings.todoPosition === 'below') {
        const rect = calendarPanel.getBoundingClientRect();
        panelNode.style.top = (rect.bottom + 10) + 'px';
        panelNode.style.right = '10px';
    } else {
        panelNode.style.right = (calendarPanel.offsetWidth + 20) + 'px';
    }
};

const renderTodoPanel = async (lines) => {
    const settings = await loadSettings(currentProjectName);
    const todos = extractTodos(settings, lines);

    if (!todos.length) { document.getElementById(TODO_PANEL_ID)?.remove(); return; }

    const panelNode = getOrCreatePanel(TODO_PANEL_ID, () => {
        const p = document.createElement('div');
        p.className = 'sb-panel';
        applyPanelSettings(p, 'todo');
        positionTodoPanel(p, settings);
        return p;
    });
    if (!panelNode) return;
    panelNode.innerHTML = '';

    const activeTodos = todos.filter(t => !t.done);
    const doneTodos = todos.filter(t => t.done);

    appendPanelTitle(panelNode, `📝 TODO LIST（${activeTodos.length} / ${todos.length}）`);
    attachCloseButton(panelNode, TODO_PANEL_ID);
    attachSettingsButton(panelNode);

    const list = document.createElement('div');
    panelNode.appendChild(list);

    const items = [];
    [...activeTodos, ...doneTodos].forEach(todo => {
        const row = createTodoRow(todo);
        items.push({ dom: row, done: todo.done });
        list.appendChild(row);
    });

    const activeItems = items.filter(x => !x.done);
    const doneItems = items.filter(x => x.done);

    const showCollapsed = () => {
        activeItems.forEach((x, i) => { x.dom.style.display = i < TODO_SHOW_COUNT ? '' : 'none'; });
        doneItems.forEach(x => { x.dom.style.display = 'none'; });
    };
    const showAll = () => { items.forEach(x => { x.dom.style.display = ''; }); };
    showCollapsed();

    panelNode.addEventListener('mouseenter', showAll);
    panelNode.addEventListener('mouseleave', showCollapsed);
};
