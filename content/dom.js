/* ================= DOM ユーティリティ ================= */

const isExtensionAlive = () =>
    !!window.__SB_EXTENSION_RUNNING__;

const getOrCreatePanel = (id, create) => {
    if (closedPanels.has(id)) return null;
    let el = document.getElementById(id);
    if (el) return el;

    el = create();
    el.id = id;
    document.body.appendChild(el);
    return el;
};

/* --- 共通パネル（title + body 構造） --- */
const createStandardPanel = () => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base);
    applyPanelSettings(panelNode, 'main');
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

/* --- 共通パネルヘッダー設定（議事録・論文紹介・発表練習で共通） --- */
const setupPanelHeader = (panelNode, rawLines, icon = '📌') => {
    const headerNode = panelNode.querySelector('#' + MAIN_TITLE_ID);
    const bodyNode = panelNode.querySelector('#' + MAIN_BODY_ID);
    const title = rawLines[0]?.text || '';
    const titleId = rawLines[0]?.id;

    headerNode.textContent = icon + ' ' + title;
    applyStyle(headerNode, Styles.text.panelTitle);
    if (titleId) headerNode.onclick = () => jumpToLineId(titleId);

    return { headerNode, bodyNode, title, titleId };
};

/* --- テキストノード --- */
const renderPageTitle = (parentNode, rawLines) => {
    if (!rawLines || !rawLines.length) return null;
    const text = (rawLines[0].text || '').trim();
    if (!text) return null;
    return appendPanelTitle(parentNode, text, () => jumpToLineId(rawLines[0].id));
};

const appendPanelTitle = (parentNode, text, onClick) => {
    return appendTextNode(parentNode, text, Styles.text.panelTitle, onClick);
};

const appendSectionHeader = (parentNode, text, onClick) => {
    return appendTextNode(
        parentNode, text,
        [Styles.text.sectionTitle, Styles.list.ellipsis].join(''),
        onClick
    );
};

const appendTextNode = (parentNode, text, style, onClick) => {
    const node = document.createElement('div');
    node.textContent = text;
    applyStyle(node, style);
    if (onClick) node.onclick = onClick;
    parentNode.appendChild(node);
    return node;
};

/* --- ボタン・コントロール --- */
const attachCloseButton = (panelNode, panelId) => {
    const btn = document.createElement('div');
    btn.textContent = '\u2715';
    btn.style = `font-weight:bold;position:absolute;top:4px;right:6px;cursor:pointer;font-size:14px;color:${Theme.titleText};`;

    btn.onclick = () => {
        closedPanels.add(panelId);
        panelNode.remove();
    };

    panelNode.style.position = 'fixed';
    panelNode.appendChild(btn);
};

const attachSettingsButton = (panelNode) => {
    const btn = document.createElement('div');
    btn.textContent = '\u2699';
    btn.style = `position:absolute;top:4px;right:24px;cursor:pointer;font-size:14px;color:${Theme.titleText};`;
    btn.onclick = () => renderSettingsPanel(panelNode);
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
    s.style = 'cursor:pointer';
    s.onclick = fn;
    return s;
};
