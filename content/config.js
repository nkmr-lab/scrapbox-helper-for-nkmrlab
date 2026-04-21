/* ================= 設定 ================= */
const DEFAULT_SETTINGS = {
    /* --- 基本 --- */
    userName: '',
    idleOpacity: 0.35,
    theme: 'normal',
    customColors: {},
    /* --- フロートメニュー --- */
    floatMenuPosition: 'bottom-right',
    floatMenuWidth: 320,
    showPageCreate: 'auto',       // 'auto'(nkmr-labのみ) | 'show' | 'hide'
    recentPagesCount: 5,
    frequentPagesCount: 5,
    pageAlign: 'center',          // 'center' | 'left' | 'right'
    /* --- メインパネル（トップページ） --- */
    mainPosition: 'top-right',
    mainWidth: 480,
    mainHeight: 560,
    /* --- カレンダーパネル --- */
    calendarPosition: 'top-right',
    calendarWidth: 480,
    calendarHeight: 560,
    calendarFontSize: 11,
    calendarFontSizeExpanded: 14,
    calendarHeatmap: true,
    /* --- TODOパネル --- */
    todoMark: '[_]',
    doneMark: '[x]',
    todoPosition: 'below',       // 'side' | 'below'
    todoWidth: 320,
    todoHeight: 400,
    todoShowCount: 5,
    /* --- その他パネル（議事録・論文紹介等） --- */
    otherPosition: 'top-right',
    otherWidth: 480,
    otherHeight: 560,
    /* --- AIサポート --- */
    openaiApiKey: '',
    promptSummary: '',            // 空欄ならデフォルトプロンプト
    promptExperimentReview: '',
    promptProgramParse: '',
    /* --- 同期設定（何をchrome.storage.syncで共有するか） --- */
    syncSystem: true,       // システム設定（名前・TODOマーク・プロンプト等）
    syncDisplay: false,     // 表示設定（パネルサイズ・位置・テーマ・色等）
    syncPinned: true,
    syncHistory: true,
    syncUserMap: true,
};

const POSITION_OPTIONS = [
    ['top-right', '右上'], ['top-left', '左上'],
    ['bottom-right', '右下'], ['bottom-left', '左下'],
];

/* パネル種別に応じたレイアウト設定を返す */
const getPanelLayout = (settings, panelType) => {
    switch (panelType) {
        case 'calendar': return { width: settings.calendarWidth, height: settings.calendarHeight, position: settings.calendarPosition };
        case 'todo':     return { width: settings.todoWidth, height: settings.todoHeight, position: settings.calendarPosition }; /* カレンダーに追従 */
        case 'other':    return { width: settings.otherWidth, height: settings.otherHeight, position: settings.otherPosition };
        default:         return { width: settings.mainWidth, height: settings.mainHeight, position: settings.mainPosition };
    }
};

let _settingsCache = null;
let _settingsCacheProject = null;

/* 設定キャッシュをクリアする（ページ遷移時にrouter.jsから呼ばれる） */
const clearSettingsCache = () => { _settingsCache = null; };

/* プロジェクトの設定をストレージから読み込む（sync有効ならsync優先で試みる） */
const loadSettings = (projectName) => {
    if (_settingsCache && _settingsCacheProject === projectName) {
        return Promise.resolve(_settingsCache);
    }
    return new Promise(resolve => {
        if (!projectName) { resolve({ ...DEFAULT_SETTINGS }); return; }
        /* まずlocalから読む（常に存在） */
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
    /* システムまたは表示の同期が有効ならsyncにも書く */
    if (settings.syncSystem || settings.syncDisplay) {
        getStorage(true).set({ [settingsKey(projectName)]: settings });
    }
};

/* テーマとスタイルシートを初期化する */
const initTheme = async (projectName) => {
    const settings = await loadSettings(projectName);
    applyTheme(settings);
    injectStyleSheet();
    applyPageAlign(settings.pageAlign);
};

/* Scrapboxのページコンテナを左/右/中央寄せにする */
const applyPageAlign = (align) => {
    const id = '__sb_page_align_style__';
    let styleEl = document.getElementById(id);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        document.head.appendChild(styleEl);
    }

    /* Scrapboxは .col-page / .page / .page-wrapper 等さまざまなバージョンのDOM構造がある */
    const selectors = [
        '.col-page',
        '.col-page.col-md-9',
        '.col-page.col-md-9.col-xs-12',
        '.page-wrapper',
        '.page',
        '.editor',
        '.page-column',
    ].join(', ');

    if (align === 'left') {
        styleEl.textContent = `${selectors} { margin-left:0 !important; margin-right:auto !important; }`;
    } else if (align === 'right') {
        styleEl.textContent = `${selectors} { margin-left:auto !important; margin-right:0 !important; }`;
    } else {
        styleEl.textContent = '';
    }
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

