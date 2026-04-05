/* ================= 設定 ================= */
const DEFAULT_SETTINGS = {
    userName: '',
    idleOpacity: 0.35,
    todoMark: '[_]',
    doneMark: '[x]',
    todoPosition: 'side',
    openaiApiKey: '',
    calendarWidth: 480,
    calendarHeight: 560,
    calendarFontSize: 11,
    calendarHeatmap: true,
    calendarFontSizeExpanded: 14,
    todoWidth: 320,
    todoHeight: 400,
    todoShowCount: 5,
    mainWidth: 480,
    mainHeight: 560,
    otherWidth: 480,
    otherHeight: 560,
    theme: 'normal',
    customColors: {},
    showPageCreate: 'auto',
};

const getPanelSize = (settings, panelType) => {
    switch (panelType) {
        case 'calendar': return { width: settings.calendarWidth, height: settings.calendarHeight };
        case 'todo':     return { width: settings.todoWidth, height: settings.todoHeight };
        case 'other':    return { width: settings.otherWidth, height: settings.otherHeight };
        default:         return { width: settings.mainWidth, height: settings.mainHeight };
    }
};

let _settingsCache = null;
let _settingsCacheProject = null;

const loadSettings = (projectName) => {
    if (_settingsCache && _settingsCacheProject === projectName) {
        return Promise.resolve(_settingsCache);
    }
    return new Promise(resolve => {
        if (!projectName) { resolve({ ...DEFAULT_SETTINGS }); return; }
        chrome.storage.local.get(
            { [settingsKey(projectName)]: DEFAULT_SETTINGS },
            data => {
                _settingsCache = { ...DEFAULT_SETTINGS, ...data[settingsKey(projectName)] };
                _settingsCacheProject = projectName;
                resolve(_settingsCache);
            }
        );
    });
};

const saveSettings = (projectName, settings) => {
    if (!projectName) return;
    _settingsCache = null;
    chrome.storage.local.set({ [settingsKey(projectName)]: settings });
};

const initTheme = async (projectName) => {
    const settings = await loadSettings(projectName);
    applyTheme(settings);
    injectStyleSheet();
};

const applyPanelSettings = async (panelNode, panelType = 'main') => {
    const settings = await loadSettings(currentProjectName);
    const size = getPanelSize(settings, panelType);
    let fadeTimer = null;

    panelNode.style.width = size.width + 'px';
    if (panelType === 'calendar') {
        panelNode.style.height = size.height + 'px';
    } else {
        panelNode.style.maxHeight = size.height + 'px';
    }
    panelNode.style.opacity = '1';

    panelNode.onmouseenter = () => {
        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        panelNode.style.opacity = '1';
    };
    panelNode.onmouseleave = () => {
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
            panelNode.style.opacity = settings.idleOpacity;
        }, FADE_TIMEOUT);
    };
};

/* ================= 設定画面（タブ式） ================= */
const THEME_LABELS = { normal: 'ノーマル', dark: 'ダーク' };

const COLOR_KEY_LABELS = {
    panelBg:'パネル背景', panelBorder:'パネル枠線',
    titleBg:'タイトル背景', titleText:'タイトル文字',
    headerBg:'ヘッダー背景', headerText:'ヘッダー文字',
    sectionBg:'セクション背景', sectionBorder:'セクション枠線',
    subTitleBg:'サブタイトル背景',
    text:'本文', textMuted:'薄い文字', border:'枠線',
    calSunday:'カレンダー日曜', calSaturday:'カレンダー土曜', calToday:'カレンダー今日',
    statsBar:'統計バー', reviewOk:'レビューOK', reviewNg:'レビューNG',
};

/* --- UI部品 --- */
const _field = (label, el) => {
    const wrap = document.createElement('div');
    wrap.className = 'sb-settings-field';
    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.className = 'sb-settings-label';
    wrap.append(lbl, el);
    return wrap;
};

const _input = (v, type = 'text') => {
    const i = document.createElement('input');
    i.type = type; i.value = v; i.className = 'sb-input';
    return i;
};

const _select = (value, options) => {
    const s = document.createElement('select');
    s.className = 'sb-select';
    options.forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if (val === value) opt.selected = true;
        s.appendChild(opt);
    });
    return s;
};

/* --- タブ切替ヘルパー --- */
const createTabs = (tabs) => {
    const bar = document.createElement('div');
    bar.className = 'sb-tab-bar';
    const panels = [];

    tabs.forEach(({ label, content }, i) => {
        const tab = document.createElement('div');
        tab.className = 'sb-tab' + (i === 0 ? ' sb-tab--active' : '');
        tab.textContent = label;

        const panel = document.createElement('div');
        panel.className = 'sb-tab-content' + (i === 0 ? ' sb-tab-content--active' : '');
        panel.appendChild(content);

        tab.onclick = () => {
            bar.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('sb-tab--active'));
            panels.forEach(p => p.classList.remove('sb-tab-content--active'));
            tab.classList.add('sb-tab--active');
            panel.classList.add('sb-tab-content--active');
        };

        bar.appendChild(tab);
        panels.push(panel);
    });

    return { bar, panels };
};

/* --- メイン --- */
const openSettingsModal = async () => {
    /* 既に開いていたら閉じる */
    document.getElementById(SETTINGS_MODAL_ID)?.remove();

    const settings = await loadSettings(currentProjectName);

    /* オーバーレイ */
    const overlay = document.createElement('div');
    overlay.id = SETTINGS_MODAL_ID;
    overlay.className = 'sb-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    /* モーダル本体 */
    const modal = document.createElement('div');
    modal.className = 'sb-modal';
    modal.onclick = (e) => e.stopPropagation();

    /* 閉じるボタン */
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.className = 'sb-modal-close';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    /* タイトル */
    const title = document.createElement('div');
    title.textContent = '⚙ 設定';
    title.className = 'sb-modal-title';
    modal.appendChild(title);

    const panelNode = modal;

    /* ===== 入力要素 ===== */
    const nameI = _input(settings.userName);
    const oI = _input(settings.idleOpacity, 'number');
    const apiKeyI = _input(settings.openaiApiKey, 'password');
    apiKeyI.placeholder = 'sk-...';
    const pageCreateI = _select(settings.showPageCreate, [
        ['auto', '自動（nkmr-labのみ表示）'], ['show', '常に表示'], ['hide', '非表示'],
    ]);
    const themeI = _select(settings.theme, Object.entries(THEME_LABELS));

    const calWI = _input(settings.calendarWidth, 'number');
    const calHI = _input(settings.calendarHeight, 'number');
    const calFI = _input(settings.calendarFontSize, 'number');
    const calFEI = _input(settings.calendarFontSizeExpanded, 'number');
    const calHeatI = _select(settings.calendarHeatmap ? 'on' : 'off', [
        ['on', 'ON'], ['off', 'OFF'],
    ]);

    const todoI = _input(settings.todoMark);
    const doneI = _input(settings.doneMark);
    const todoPosI = _select(settings.todoPosition, [
        ['side', '横（カレンダーの隣）'], ['below', '下（カレンダーの下）'],
    ]);
    const todoWI = _input(settings.todoWidth, 'number');
    const todoHI = _input(settings.todoHeight, 'number');
    const todoShowI = _input(settings.todoShowCount, 'number');

    const mainWI = _input(settings.mainWidth, 'number');
    const mainHI = _input(settings.mainHeight, 'number');

    const otherWI = _input(settings.otherWidth, 'number');
    const otherHI = _input(settings.otherHeight, 'number');

    /* ===== 基本タブ ===== */
    const basicContent = document.createElement('div');
    basicContent.append(
        _field('名前', nameI),
        _field('非アクティブ透明度', oI),
        _field('OpenAI API Key', apiKeyI),
        _field('ページ生成メニュー', pageCreateI),
        _field('テーマ', themeI),
    );

    /* カスタムカラー（基本タブ内に折りたたみ） */
    const customColors = { ...(settings.customColors || {}) };
    const colorInputs = {};
    const colorSection = document.createElement('div');
    colorSection.style = 'display:none';

    Object.entries(COLOR_KEY_LABELS).forEach(([key, label]) => {
        const baseTheme = THEMES[themeI.value] || THEMES.normal;
        const currentVal = customColors[key] || '';

        const row = document.createElement('div');
        row.className = 'sb-color-row';

        const colorI = document.createElement('input');
        colorI.type = 'color';
        colorI.value = currentVal || baseTheme[key] || '#000000';
        colorI.className = 'sb-color-input';

        const textI = document.createElement('input');
        textI.type = 'text'; textI.value = currentVal;
        textI.placeholder = baseTheme[key] || '';
        textI.className = 'sb-color-text';

        const labelNode = document.createElement('div');
        labelNode.textContent = label;
        labelNode.className = 'sb-color-label';

        colorI.oninput = () => { textI.value = colorI.value; };
        textI.oninput = () => {
            if (/^#[0-9a-fA-F]{3,8}$/.test(textI.value)) colorI.value = textI.value;
        };

        colorInputs[key] = textI;
        row.append(labelNode, colorI, textI);
        colorSection.appendChild(row);
    });

    const colorToggle = document.createElement('div');
    colorToggle.textContent = '▶ カスタムカラー（詳細）';
    colorToggle.className = 'sb-toggle-btn';
    colorToggle.onclick = () => {
        const open = colorSection.style.display !== 'none';
        colorSection.style.display = open ? 'none' : '';
        colorToggle.textContent = (open ? '▶' : '▼') + ' カスタムカラー（詳細）';
    };

    themeI.onchange = () => {
        const base = THEMES[themeI.value] || THEMES.normal;
        Object.entries(colorInputs).forEach(([key, textI]) => {
            textI.placeholder = base[key] || '';
            if (!textI.value) textI.previousElementSibling.value = base[key] || '#000000';
        });
    };

    basicContent.append(colorToggle, colorSection);

    /* ===== カレンダータブ ===== */
    const calContent = document.createElement('div');
    calContent.append(
        _field('横幅', calWI), _field('縦幅', calHI),
        _field('文字サイズ(px)', calFI), _field('拡大時文字サイズ(px)', calFEI),
        _field('ヒートマップ', calHeatI),
    );

    /* ===== TODOタブ ===== */
    const todoContent = document.createElement('div');
    todoContent.append(
        _field('TODO マーク', todoI), _field('完了マーク', doneI),
        _field('表示件数', todoShowI),
        _field('横幅', todoWI), _field('縦幅', todoHI), _field('位置', todoPosI),
    );

    /* ===== メインタブ（トップページ） ===== */
    const mainContent = document.createElement('div');
    mainContent.append(
        _field('横幅', mainWI), _field('縦幅', mainHI),
    );

    /* ===== その他ページタブ（議事録・論文紹介・実験計画書等） ===== */
    const otherContent = document.createElement('div');
    otherContent.append(
        _field('横幅', otherWI), _field('縦幅', otherHI),
    );

    /* ===== タブ組み立て ===== */
    const { bar, panels } = createTabs([
        { label: '基本', content: basicContent },
        { label: 'メイン', content: mainContent },
        { label: 'カレンダー', content: calContent },
        { label: 'TODO', content: todoContent },
        { label: 'その他', content: otherContent },
    ]);

    panelNode.append(bar, ...panels);

    /* 保存ボタン */
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'sb-save-btn';
    saveBtn.onclick = () => {
        const newCustom = {};
        Object.entries(colorInputs).forEach(([key, textI]) => {
            const v = textI.value.trim();
            if (v) newCustom[key] = v;
        });
        saveSettings(currentProjectName, {
            userName: nameI.value.trim(), idleOpacity: +oI.value,
            todoMark: todoI.value, doneMark: doneI.value,
            todoPosition: todoPosI.value, openaiApiKey: apiKeyI.value.trim(),
            calendarWidth: +calWI.value, calendarHeight: +calHI.value,
            calendarFontSize: +calFI.value, calendarFontSizeExpanded: +calFEI.value,
            calendarHeatmap: calHeatI.value === 'on',
            todoWidth: +todoWI.value, todoHeight: +todoHI.value,
            todoShowCount: +todoShowI.value,
            mainWidth: +mainWI.value, mainHeight: +mainHI.value,
            otherWidth: +otherWI.value, otherHeight: +otherHI.value,
            theme: themeI.value, customColors: newCustom,
            showPageCreate: pageCreateI.value,
        });
        location.reload();
    };
    panelNode.appendChild(saveBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};

const renderSettingsEntry = (panelNode) => {
    appendSectionHeader(panelNode, '\u3000⚙ 設定', () => openSettingsModal());
};
