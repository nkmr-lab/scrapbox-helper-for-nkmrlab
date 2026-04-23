/* ================= View レイヤー ================= */
/* DOM 生成・操作は全てここに集約。className ベースでスタイル適用。 */

/* --- パネル管理 --- */
/* 指定IDのパネルを取得し、なければ生成して返す */
const getOrCreatePanel = (id, create) => {
    if (_closedPanels.has(id)) return null;
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
    appendCloseButton(panelNode, MAIN_PANEL_ID);

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
const renderPanelHeader = (panelNode, rawLines, icon = '📌') => {
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
const appendAiSummaryButton = (titleNode, cacheKey, generateFn) => {
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

/* --- ラベル --- */
/* 設定ラベルを生成する */
const renderLabel = (text) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.className = 'sb-settings-label';
    return el;
};

/* --- モーダル生成 --- */
/* オーバーレイ+モーダル+閉じるボタン+タイトルを持つモーダルを生成する */
const createModalDialog = (modalId, titleText) => {
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'sb-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const modal = document.createElement('div');
    modal.className = 'sb-modal';
    modal.onclick = (e) => e.stopPropagation();

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.className = 'sb-modal-close';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    const title = document.createElement('div');
    title.textContent = titleText;
    title.className = 'sb-modal-title';
    modal.appendChild(title);

    overlay.appendChild(modal);

    return { overlay, modal, close: () => overlay.remove() };
};

/* --- メニューボタン --- */
/* タイマー・ページ生成・設定ボタン行をパネルに追加する */
const renderMenuButtons = (panelNode, showCreate) => {
    const btnRow = document.createElement('div');
    btnRow.className = 'sb-form-row sb-menu-btn-row';

    const timerBtn = document.createElement('button');
    timerBtn.textContent = 'タイマー';
    timerBtn.className = 'sb-menu-btn';
    timerBtn.onclick = () => openTimer();
    btnRow.appendChild(timerBtn);

    if (showCreate) {
        const createBtn = document.createElement('button');
        createBtn.textContent = 'ページ生成';
        createBtn.className = 'sb-menu-btn';
        createBtn.onclick = () => openPageCreateModal();
        btnRow.appendChild(createBtn);
    }

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '設定';
    settingsBtn.className = 'sb-menu-btn';
    settingsBtn.onclick = () => openSettingsModal();
    btnRow.appendChild(settingsBtn);

    panelNode.appendChild(btnRow);
};

/* --- ボタン・コントロール --- */
/* パネルに閉じるボタンを追加する */
const appendCloseButton = (panelNode, panelId) => {
    const btn = document.createElement('div');
    btn.textContent = '✕';
    btn.className = 'sb-close-btn';
    btn.onclick = () => {
        _closedPanels.add(panelId);
        panelNode.remove();
    };
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
