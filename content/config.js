/* ================= 設定 ================= */
const DEFAULT_SETTINGS = {
    userName: '',
    idleOpacity: 0.35,
    todoMark: '[_]',
    doneMark: '[x]',
    todoPosition: 'below',
    openaiApiKey: '',
    calendarPosition: 'top-right',
    calendarWidth: 480,
    calendarHeight: 560,
    calendarFontSize: 11,
    calendarHeatmap: true,
    calendarFontSizeExpanded: 14,
    todoWidth: 320,
    todoHeight: 400,
    todoShowCount: 5,
    mainPosition: 'top-right',
    mainWidth: 480,
    mainHeight: 560,
    otherPosition: 'top-right',
    otherWidth: 480,
    otherHeight: 560,
    theme: 'normal',
    customColors: {},
    floatMenuPosition: 'bottom-right',
    floatMenuWidth: 320,
    showPageCreate: 'auto',
};

const POSITION_OPTIONS = [
    ['top-right', '右上'], ['top-left', '左上'],
    ['bottom-right', '右下'], ['bottom-left', '左下'],
];

/* パネル種別に応じたレイアウト設定を返す */
const getPanelLayout = (settings, panelType) => {
    switch (panelType) {
        case 'calendar': return { width: settings.calendarWidth, height: settings.calendarHeight, position: settings.calendarPosition };
        case 'todo':     return { width: settings.todoWidth, height: settings.todoHeight, position: settings.calendarPosition };
        case 'other':    return { width: settings.otherWidth, height: settings.otherHeight, position: settings.otherPosition };
        default:         return { width: settings.mainWidth, height: settings.mainHeight, position: settings.mainPosition };
    }
};

let _settingsCache = null;
let _settingsCacheProject = null;

/* プロジェクトの設定をストレージから読み込む */
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

/* プロジェクトの設定をストレージに保存する */
const saveSettings = (projectName, settings) => {
    if (!projectName) return;
    _settingsCache = null;
    chrome.storage.local.set({ [settingsKey(projectName)]: settings });
};

/* テーマとスタイルシートを初期化する */
const initTheme = async (projectName) => {
    const settings = await loadSettings(projectName);
    applyTheme(settings);
    injectStyleSheet();
};

/* パネルの表示位置をポジション文字列に基づいて設定する */
const applyPosition = (panelNode, pos) => {
    panelNode.style.top = '';
    panelNode.style.bottom = '';
    panelNode.style.left = '';
    panelNode.style.right = '';

    if (pos === 'top-left')     { panelNode.style.top = '10px'; panelNode.style.left = '10px'; }
    else if (pos === 'bottom-right') { panelNode.style.bottom = '10px'; panelNode.style.right = '10px'; }
    else if (pos === 'bottom-left')  { panelNode.style.bottom = '10px'; panelNode.style.left = '10px'; }
    else                        { panelNode.style.top = '10px'; panelNode.style.right = '10px'; }
};

/* パネルにサイズ・位置・フェードアニメーションを適用する */
const applyPanelSettings = async (panelNode, panelType = 'main') => {
    const settings = await loadSettings(currentProjectName);
    const layout = getPanelLayout(settings, panelType);
    let fadeTimer = null;

    panelNode.style.width = layout.width + 'px';
    if (panelType === 'calendar') {
        panelNode.style.height = layout.height + 'px';
    } else {
        panelNode.style.maxHeight = layout.height + 'px';
    }
    /* TODOパネルの位置はカレンダーに追従するため、ここでは設定しない */
    if (panelType !== 'todo') {
        applyPosition(panelNode, layout.position);
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
/* タブバーとタブパネルを生成して返す */
const renderTabs = (tabs) => {
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

/* --- タブビルダー --- */
/* 基本設定タブ（名前・透明度・APIキー・テーマ・カスタムカラー）を構築する */
const _buildBasicTab = (settings) => {
    const nameI = _input(settings.userName);
    const oI = _input(settings.idleOpacity, 'number');
    const apiKeyI = _input(settings.openaiApiKey, 'password');
    apiKeyI.placeholder = 'sk-...';
    const pageCreateI = _select(settings.showPageCreate, [
        ['auto', '自動（nkmr-labのみ表示）'], ['show', '常に表示'], ['hide', '非表示'],
    ]);
    const themeI = _select(settings.theme, Object.entries(THEME_LABELS));
    const floatPosI = _select(settings.floatMenuPosition, POSITION_OPTIONS);
    const floatWI = _input(settings.floatMenuWidth, 'number');

    const basicContent = document.createElement('div');
    basicContent.append(
        _field('名前', nameI),
        _field('非アクティブ透明度', oI),
        _field('OpenAI API Key', apiKeyI),
        _field('ページ生成メニュー', pageCreateI),
        _field('メニュー位置', floatPosI),
        _field('メニュー横幅', floatWI),
        _field('テーマ', themeI),
    );

    const { colorToggle, colorSection, colorInputs } = _buildColorCustomizer(settings, themeI);
    basicContent.append(colorToggle, colorSection);

    return { basicContent, nameI, oI, apiKeyI, pageCreateI, themeI, floatPosI, floatWI, colorInputs };
};

/* カスタムカラー設定UI（折りたたみ）を構築する */
const _buildColorCustomizer = (settings, themeI) => {
    const customColors = { ...(settings.customColors || {}) };
    const colorInputs = {};
    const colorSection = document.createElement('div');
    colorSection.style.display = 'none';

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

    return { colorToggle, colorSection, colorInputs };
};

/* カレンダー設定タブを構築する */
const _buildCalendarTab = (settings) => {
    const calPosI = _select(settings.calendarPosition, POSITION_OPTIONS);
    const calWI = _input(settings.calendarWidth, 'number');
    const calHI = _input(settings.calendarHeight, 'number');
    const calFI = _input(settings.calendarFontSize, 'number');
    const calFEI = _input(settings.calendarFontSizeExpanded, 'number');
    const calHeatI = _select(settings.calendarHeatmap ? 'on' : 'off', [
        ['on', 'ON'], ['off', 'OFF'],
    ]);

    const calContent = document.createElement('div');
    calContent.append(
        _field('位置', calPosI),
        _field('横幅', calWI), _field('縦幅', calHI),
        _field('文字サイズ(px)', calFI), _field('拡大時文字サイズ(px)', calFEI),
        _field('ヒートマップ', calHeatI),
    );

    return { calContent, calPosI, calWI, calHI, calFI, calFEI, calHeatI };
};

/* TODO設定タブを構築する */
const _buildTodoTab = (settings) => {
    const todoI = _input(settings.todoMark);
    const doneI = _input(settings.doneMark);
    const todoPosI = _select(settings.todoPosition, [
        ['side', '横（カレンダーの隣）'], ['below', '下（カレンダーの下）'],
    ]);
    const todoWI = _input(settings.todoWidth, 'number');
    const todoHI = _input(settings.todoHeight, 'number');
    const todoShowI = _input(settings.todoShowCount, 'number');

    const todoContent = document.createElement('div');
    todoContent.append(
        _field('TODO マーク', todoI), _field('完了マーク', doneI),
        _field('表示件数', todoShowI),
        _field('横幅', todoWI), _field('縦幅', todoHI),
        _field('カレンダーとの位置', todoPosI),
    );

    return { todoContent, todoI, doneI, todoPosI, todoWI, todoHI, todoShowI };
};

/* メインパネル設定タブを構築する */
const _buildMainTab = (settings) => {
    const mainPosI = _select(settings.mainPosition, POSITION_OPTIONS);
    const mainWI = _input(settings.mainWidth, 'number');
    const mainHI = _input(settings.mainHeight, 'number');

    const mainContent = document.createElement('div');
    mainContent.append(
        _field('位置', mainPosI),
        _field('横幅', mainWI), _field('縦幅', mainHI),
    );

    return { mainContent, mainPosI, mainWI, mainHI };
};

/* その他パネル設定タブを構築する */
const _buildOtherTab = (settings) => {
    const otherPosI = _select(settings.otherPosition, POSITION_OPTIONS);
    const otherWI = _input(settings.otherWidth, 'number');
    const otherHI = _input(settings.otherHeight, 'number');

    const otherContent = document.createElement('div');
    otherContent.append(
        _field('位置', otherPosI),
        _field('横幅', otherWI), _field('縦幅', otherHI),
    );

    return { otherContent, otherPosI, otherWI, otherHI };
};

/* 全入力要素から設定値オブジェクトを収集する */
const _collectSettingsValues = ({
    nameI, oI, apiKeyI, pageCreateI, themeI, floatPosI, floatWI, colorInputs,
    calPosI, calWI, calHI, calFI, calFEI, calHeatI,
    todoI, doneI, todoPosI, todoWI, todoHI, todoShowI,
    mainPosI, mainWI, mainHI,
    otherPosI, otherWI, otherHI,
}) => {
    const newCustom = {};
    Object.entries(colorInputs).forEach(([key, textI]) => {
        const v = textI.value.trim();
        if (v) newCustom[key] = v;
    });
    return {
        userName: nameI.value.trim(), idleOpacity: +oI.value,
        todoMark: todoI.value, doneMark: doneI.value,
        todoPosition: todoPosI.value, openaiApiKey: apiKeyI.value.trim(),
        calendarPosition: calPosI.value,
        calendarWidth: +calWI.value, calendarHeight: +calHI.value,
        calendarFontSize: +calFI.value, calendarFontSizeExpanded: +calFEI.value,
        calendarHeatmap: calHeatI.value === 'on',
        todoWidth: +todoWI.value, todoHeight: +todoHI.value,
        todoShowCount: +todoShowI.value,
        mainPosition: mainPosI.value,
        mainWidth: +mainWI.value, mainHeight: +mainHI.value,
        otherPosition: otherPosI.value,
        otherWidth: +otherWI.value, otherHeight: +otherHI.value,
        theme: themeI.value, customColors: newCustom,
        floatMenuPosition: floatPosI.value,
        floatMenuWidth: +floatWI.value,
        showPageCreate: pageCreateI.value,
    };
};

/* --- メイン --- */
/* 設定モーダルを開いてタブ式UIを表示する */
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

    /* ===== タブ構築 ===== */
    const basic = _buildBasicTab(settings);
    const cal = _buildCalendarTab(settings);
    const todo = _buildTodoTab(settings);
    const main = _buildMainTab(settings);
    const other = _buildOtherTab(settings);

    /* ===== タブ組み立て ===== */
    const { bar, panels } = renderTabs([
        { label: '基本', content: basic.basicContent },
        { label: 'メイン', content: main.mainContent },
        { label: 'カレンダー', content: cal.calContent },
        { label: 'TODO', content: todo.todoContent },
        { label: 'その他', content: other.otherContent },
    ]);

    panelNode.append(bar, ...panels);

    /* 保存ボタン */
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'sb-save-btn';
    saveBtn.onclick = () => {
        const newSettings = _collectSettingsValues({
            ...basic, ...cal, ...todo, ...main, ...other,
        });
        saveSettings(currentProjectName, newSettings);
        location.reload();
    };
    panelNode.appendChild(saveBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};
