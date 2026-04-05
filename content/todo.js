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
    const cal = document.getElementById(CALENDAR_ID);
    if (!cal) return;

    const rect = cal.getBoundingClientRect();
    /* カレンダーに設定されているインラインの位置プロパティを直接参照 */
    const calRight = cal.style.right;
    const calLeft = cal.style.left;
    const calOnRight = !!calRight && calRight !== '';

    /* 位置プロパティをリセット */
    panelNode.style.top = '';
    panelNode.style.bottom = '';
    panelNode.style.left = '';
    panelNode.style.right = '';

    const calOnBottom = !!cal.style.bottom && cal.style.bottom !== '';

    if (settings.todoPosition === 'below') {
        if (calOnBottom) {
            /* カレンダーが下配置 → TODOはカレンダーの上に */
            panelNode.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        } else {
            panelNode.style.top = (rect.bottom + 10) + 'px';
        }
        if (calOnRight) {
            panelNode.style.right = calRight;
        } else {
            panelNode.style.left = calLeft;
        }
    } else {
        if (calOnBottom) {
            panelNode.style.bottom = cal.style.bottom;
        } else {
            panelNode.style.top = (cal.style.top || rect.top + 'px');
        }
        if (calOnRight) {
            panelNode.style.right = (parseFloat(calRight) + rect.width + 10) + 'px';
        } else {
            panelNode.style.left = (rect.right + 10) + 'px';
        }
    }
};

const renderTodoPanel = async (lines) => {
    const settings = await loadSettings(currentProjectName);
    const todos = extractTodos(settings, lines);

    if (!todos.length) { document.getElementById(TODO_PANEL_ID)?.remove(); return; }

    const panelNode = getOrCreatePanel(TODO_PANEL_ID, () => {
        const p = document.createElement('div');
        p.className = 'sb-panel';
        return p;
    });
    if (!panelNode) return;
    await applyPanelSettings(panelNode, 'todo');
    positionTodoPanel(panelNode, settings);
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

    const showCount = settings.todoShowCount || TODO_SHOW_COUNT;
    const showCollapsed = () => {
        activeItems.forEach((x, i) => { x.dom.style.display = i < showCount ? '' : 'none'; });
        doneItems.forEach(x => { x.dom.style.display = 'none'; });
    };
    const showAll = () => { items.forEach(x => { x.dom.style.display = ''; }); };
    showCollapsed();

    panelNode.addEventListener('mouseenter', showAll);
    panelNode.addEventListener('mouseleave', showCollapsed);
};
