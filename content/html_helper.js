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

const renderPageTitle = (parentNode, rawLines) => {
    if (!rawLines || !rawLines.length) return null;
    const text = (rawLines[0].text || '').trim();
    if (!text) return null;
    return appendPanelTitle(parentNode, '📌 ' + text, () => jumpToLineId(rawLines[0].id));
};

const appendPanelTitle = (parentNode, text, onClick) => {
    return appendTextNode(parentNode, text, Styles.text.panelTitle, onClick);
};

const appendSectionHeader = (parentNode, text, onClick) => {
    return appendTextNode(parentNode, text, [Styles.text.sectionTitle, Styles.list.ellipsis].join(""), onClick);
};

const appendTextNode = (parentNode, text, style, onClick) => {
    const textNode = document.createElement('div');
    textNode.textContent = text;
    applyStyle(textNode, style);
    if (onClick) textNode.onclick = onClick;
    parentNode.appendChild(textNode);
    return textNode;
};

const attachCloseButton = (panelNode, panelId) => {
    const btn = document.createElement('div');
    btn.textContent = '✕';
    btn.style = `font-weight:bold;position:absolute;top:4px;right:6px;cursor:pointer;font-size:14px;color:#eee;`;

    btn.onclick = () => {
        closedPanels.add(panelId);
        panelNode.remove();
    };

    panelNode.style.position = 'fixed'; // 念のため
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