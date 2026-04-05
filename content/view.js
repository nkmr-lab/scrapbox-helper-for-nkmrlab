/* ================= View レイヤー ================= */
/* DOM 生成・操作は全てここに集約。className ベースでスタイル適用。 */

const isExtensionAlive = () =>
    !!window.__SB_EXTENSION_RUNNING__;

/* --- パネル管理 --- */
const getOrCreatePanel = (id, create) => {
    if (closedPanels.has(id)) return null;
    let el = document.getElementById(id);
    if (el) return el;

    el = create();
    el.id = id;
    document.body.appendChild(el);
    return el;
};

const createStandardPanel = (panelType = 'other') => {
    const panelNode = document.createElement('div');
    panelNode.className = 'sb-panel';
    applyPanelSettings(panelNode, panelType);
    attachCloseButton(panelNode, MAIN_PANEL_ID);
    attachSettingsButton(panelNode);

    const titleNode = document.createElement('div');
    titleNode.id = MAIN_TITLE_ID;
    panelNode.appendChild(titleNode);

    const bodyNode = document.createElement('div');
    bodyNode.id = MAIN_BODY_ID;
    panelNode.appendChild(bodyNode);

    return panelNode;
};

/* --- パネルヘッダー設定（議事録・論文紹介・発表練習で共通） --- */
const setupPanelHeader = (panelNode, rawLines, icon = '📌') => {
    const headerNode = panelNode.querySelector('#' + MAIN_TITLE_ID);
    const bodyNode = panelNode.querySelector('#' + MAIN_BODY_ID);
    const title = rawLines[0]?.text || '';
    const titleId = rawLines[0]?.id;

    headerNode.textContent = icon + ' ' + title;
    headerNode.className = 'sb-title';
    if (titleId) headerNode.onclick = () => jumpToLineId(titleId);

    return { headerNode, bodyNode, title, titleId };
};

/* --- テキスト要素生成 --- */
const renderPageTitle = (parentNode, rawLines) => {
    if (!rawLines || !rawLines.length) return null;
    const text = (rawLines[0].text || '').trim();
    if (!text) return null;
    return appendPanelTitle(parentNode, text, () => jumpToLineId(rawLines[0].id));
};

const appendPanelTitle = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-title', onClick);
};

const appendSectionHeader = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-section', onClick);
};

const appendItem = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item', onClick);
};

const appendItemMuted = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item sb-item--muted', onClick);
};

const appendItemSub = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item sb-item--sub', onClick);
};

const appendEl = (parentNode, text, className, onClick) => {
    const node = document.createElement('div');
    node.textContent = text;
    node.className = className;
    if (onClick) node.onclick = onClick;
    parentNode.appendChild(node);
    return node;
};

/* --- 質問リスト描画 --- */
const appendQuestionList = (parentNode, questions) => {
    questions.forEach(q => {
        appendItem(
            parentNode,
            '・' + (q.author ? `${q.author}: ` : '?: ') + q.text,
            () => jumpToLineId(q.id)
        );
    });
};

/* --- AI要約（キャッシュ付き） --- */
const attachAiSummaryButton = (titleNode, cacheKey, generateFn) => {
    const cached = getCachedAiResult(cacheKey);

    if (cached) {
        const box = document.createElement('div');
        box.className = 'sb-ai-summary';
        box.textContent = '🧠 AI要約\n' + cached;
        titleNode.after(box);
        return;
    }

    const btn = document.createElement('span');
    btn.textContent = ' 🧠';
    btn.className = 'sb-ai-btn';
    btn.onclick = async () => {
        btn.textContent = ' ⏳';
        const result = await generateFn();
        btn.textContent = ' 🧠';
        if (!result) return;
        setCachedAiResult(cacheKey, result);
        const box = document.createElement('div');
        box.className = 'sb-ai-summary';
        box.textContent = '🧠 AI要約\n' + result;
        titleNode.after(box);
        btn.remove();
    };
    titleNode.appendChild(btn);
};

/* --- ボタン・コントロール --- */
const attachCloseButton = (panelNode, panelId) => {
    const btn = document.createElement('div');
    btn.textContent = '✕';
    btn.className = 'sb-close-btn';
    btn.onclick = () => {
        closedPanels.add(panelId);
        panelNode.remove();
    };
    panelNode.appendChild(btn);
};

const attachSettingsButton = (panelNode) => {
    const btn = document.createElement('div');
    btn.textContent = '⚙';
    btn.className = 'sb-settings-btn';
    btn.onclick = () => openSettingsModal();
    panelNode.appendChild(btn);
};

const jumpToLineId = id => {
    const a = document.createElement('a');
    a.href = '#' + id;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

const createButton = (label, fn) => {
    const s = document.createElement('span');
    s.textContent = label;
    s.className = 'sb-btn';
    s.onclick = fn;
    return s;
};
