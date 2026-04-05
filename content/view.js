/* ================= View レイヤー ================= */
/* DOM 生成・操作は全てここに集約。className ベースでスタイル適用。 */

const isExtensionAlive = () =>
    !!window.__SB_EXTENSION_RUNNING__;

/* --- パネル管理 --- */
/* 指定IDのパネルを取得し、なければ生成して返す */
const getOrCreatePanel = (id, create) => {
    if (closedPanels.has(id)) return null;
    let el = document.getElementById(id);
    if (el) return el;

    el = create();
    el.id = id;
    document.body.appendChild(el);
    return el;
};

/* タイトル・ボディ付きの標準パネルを生成する */
const renderStandardPanel = (panelType = 'other') => {
    const panelNode = document.createElement('div');
    panelNode.className = 'sb-panel';
    applyPanelSettings(panelNode, panelType);
    attachCloseButton(panelNode, MAIN_PANEL_ID);

    const titleNode = document.createElement('div');
    titleNode.id = MAIN_TITLE_ID;
    panelNode.appendChild(titleNode);

    const bodyNode = document.createElement('div');
    bodyNode.id = MAIN_BODY_ID;
    panelNode.appendChild(bodyNode);

    return panelNode;
};

/* --- パネルヘッダー設定（議事録・論文紹介・発表練習で共通） --- */
/* パネルのヘッダーにページタイトルを設定する */
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
/* ページタイトルをパネルに追加する */
const renderPageTitle = (parentNode, rawLines) => {
    if (!rawLines || !rawLines.length) return null;
    const text = (rawLines[0].text || '').trim();
    if (!text) return null;
    return appendPanelTitle(parentNode, text, () => jumpToLineId(rawLines[0].id));
};

/* パネルタイトル要素を追加する */
const appendPanelTitle = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-title', onClick);
};

/* セクションヘッダー要素を追加する */
const appendSectionHeader = (parentNode, text, onClick) => {
    const cls = onClick ? 'sb-section sb-section--clickable' : 'sb-section sb-section--static';
    return appendEl(parentNode, text, cls, onClick);
};



/* クリック可能な通常アイテム要素を追加する */
const appendItem = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item', onClick);
};

/* 薄い色のアイテム要素を追加する */
const appendItemMuted = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item sb-item--muted', onClick);
};

/* サブタイトル背景のアイテム要素を追加する */
const appendItemSub = (parentNode, text, onClick) => {
    return appendEl(parentNode, text, 'sb-item sb-item--sub', onClick);
};

/* テキスト付きDOM要素を生成して親に追加する */
const appendEl = (parentNode, text, className, onClick) => {
    const node = document.createElement('div');
    node.textContent = text;
    node.className = className;
    if (onClick) node.onclick = onClick;
    parentNode.appendChild(node);
    return node;
};

/* --- 質問リスト描画 --- */
/* 質問一覧をリスト形式で描画する */
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
/* AI要約ボタンをタイトルノードに付与する */
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
/* パネルに閉じるボタンを追加する */
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

/* パネルに設定ボタンを追加する */
const attachSettingsButton = (panelNode) => {
    const btn = document.createElement('div');
    btn.textContent = '⚙';
    btn.className = 'sb-settings-btn';
    btn.onclick = () => openSettingsModal();
    panelNode.appendChild(btn);
};

/* 指定行IDの位置にスクロールジャンプする */
const jumpToLineId = id => {
    const a = document.createElement('a');
    a.href = '#' + id;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

/* ラベル付きクリックボタン要素を生成する */
const renderButton = (label, fn) => {
    const s = document.createElement('span');
    s.textContent = label;
    s.className = 'sb-btn';
    s.onclick = fn;
    return s;
};
