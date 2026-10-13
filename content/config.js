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
    showLabPay: 'auto',           // LabPay欄 'auto'(nkmr-labのみ) | 'show' | 'hide'
    /* --- LabPay欄に出す内容 --- */
    labpayShowPoints: true,       // 残高・連続来室
    labpayShowPresence: true,     // 今ラボにいる人
    labpayShowTimers: false,      // 動いている共有タイマー
    labpayShowDeadlines: true,    // 学会締め切り
    labpayDeadlinesMineOnly: true,// 自分が⭐参加している学会だけ
    labpayDeadlineCount: 3,       // 締め切りの表示件数
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
    /* タイマー設定はタイマーウィジェット自身が chrome.storage.local の __sb_timer_prefs__ に保持する */
    /* 設定・ピン留め・履歴はすべてこのPC（chrome.storage.local）にだけ保存する。
       v0.5.1 までの「Chrome同期（chrome.storage.sync）」はやめた（下の retireSyncOnce 参照） */
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

/* --- Chrome同期の廃止（v0.6.0） ---
   旧版は設定・ピン留め・履歴を chrome.storage.sync にも置いていた（PCごとに同期ON/OFFが違い、
   保存先が入れ替わってピンが見えなくなる・履歴が丸ごと上書きで抜ける・8KB上限、などの元だった）。
   各プロジェクトで最初の1回だけ、同期領域の分をこのPCへ取り込み、以後は同期領域を使わない。
   同期領域のデータは消さない（まだ更新していない別のPCが、そこにしか無いピン留め等を取り込めるように）。
   ただしAPIキーだけは同期領域から外す（旧版は同期領域を読まないので、外しても困るPCは無い）。 */
const syncRetiredKey = projectName => `sb:${projectName}:syncRetired`;
const _retireSyncPromises = {};

const retireSyncOnce = (projectName) => {
    if (!projectName || !chrome.storage.sync) return Promise.resolve();
    return (_retireSyncPromises[projectName] ||= _retireSync(projectName).catch(e => {
        console.warn('[SB Helper] 同期領域からの取り込みに失敗しました:', e);
        delete _retireSyncPromises[projectName];   /* 次の遷移でやり直す */
    }));
};

const _retireSync = async (projectName) => {
    const local = chrome.storage.local, sync = chrome.storage.sync;
    const flag = syncRetiredKey(projectName);
    if (await loadFromStorage(local, flag, false)) return;

    const sk = settingsKey(projectName), pk = pinnedKey(projectName), hk = historyKey(projectName);
    const synced = await sync.get([sk, pk, hk]);
    const mine = await local.get([sk, pk, hk]);
    const out = {};

    /* 設定: このPCに無ければ同期領域のものを採用（同期フラグは捨てる） */
    const strip = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith('sync')));
    if (synced[sk] && !mine[sk]) out[sk] = strip(synced[sk]);
    else if (mine[sk] && Object.keys(mine[sk]).some(k => k.startsWith('sync'))) out[sk] = strip(mine[sk]);

    /* ピン留め: 両方を合わせる（このPCの順を先に） */
    const pinsMine = Array.isArray(mine[pk]) ? mine[pk] : [];
    const pinsSync = Array.isArray(synced[pk]) ? synced[pk] : [];
    if (pinsSync.some(p => !pinsMine.includes(p))) out[pk] = [...pinsMine, ...pinsSync.filter(p => !pinsMine.includes(p))];

    /* 履歴: 両方を合わせて時刻順、新しい100件 */
    const histSync = Array.isArray(synced[hk]) ? synced[hk] : [];
    if (histSync.length) {
        const seen = new Set();
        out[hk] = [...(Array.isArray(mine[hk]) ? mine[hk] : []), ...histSync]
            .filter(e => e && typeof e.pageName === 'string')
            .filter(e => { const k = e.pageName + '\n' + e.ts; if (seen.has(k)) return false; seen.add(k); return true; })
            .sort((a, b) => (a.ts || 0) - (b.ts || 0))
            .slice(-HISTORY_LIMIT);
    }

    out[flag] = true;
    await local.set(out);

    if (synced[sk] && 'openaiApiKey' in synced[sk]) {
        const { openaiApiKey, ...rest } = synced[sk];
        await sync.set({ [sk]: rest });
    }
};

let _settingsCache = null;
let _settingsCacheProject = null;

/* 設定キャッシュをクリアする（ページ遷移時にrouter.jsから呼ばれる） */
const clearSettingsCache = () => { _settingsCache = null; };

/* プロジェクトの設定を読み込む（このPCの保存分。未設定項目は DEFAULT_SETTINGS で補完） */
const loadSettings = async (projectName) => {
    if (_settingsCache && _settingsCacheProject === projectName) return _settingsCache;
    if (!projectName) return { ...DEFAULT_SETTINGS };

    await retireSyncOnce(projectName);
    _settingsCache = await loadFromStorage(
        chrome.storage.local, settingsKey(projectName), {}, v => ({ ...DEFAULT_SETTINGS, ...(v || {}) }));
    _settingsCacheProject = projectName;
    return _settingsCache;
};

/* プロジェクトの設定を保存する */
const saveSettings = async (projectName, settings) => {
    if (!projectName) return;
    _settingsCache = null;
    await chrome.storage.local.set({ [settingsKey(projectName)]: settings });
};

/* テーマとスタイルシートを初期化する（pageAlignはページ種別確定後にapplyPageAlignで別途設定） */
const initTheme = async (projectName) => {
    const settings = await loadSettings(projectName);
    applyTheme(settings);
    injectStyleSheet();
};

/* ページ整列用CSS片を生成する（左寄せ/右寄せ時のみ内容あり） */
/* Scrapboxは .container 内の .page-column が display:grid で中央配置しているので両方を上書きする */
const buildPageAlignCss = (align) => {
    if (align === 'left') {
        return [
            '#app-container .container { margin-left:0 !important; margin-right:auto !important; max-width:none !important; width:auto !important; }',
            '.page-column { justify-content:start !important; }',
        ];
    }
    if (align === 'right') {
        return [
            '#app-container .container { margin-left:auto !important; margin-right:0 !important; max-width:none !important; width:auto !important; }',
            '.page-column { justify-content:end !important; }',
        ];
    }
    return [];
};

/* page-menu（Scrapbox純正の右上縦メニュー）をカレンダー/フロートメニューと衝突しない位置へ退避するCSS片を生成する */
/* カレンダーが右にある場合のみ page-menu を反対側（縦方向）に移動し、同じ辺にフロートメニュー☰があれば更にその分オフセットする */
const buildPageMenuCss = (calendarPosition, floatMenuPosition) => {
    const base = `position:fixed !important; right:${PAGE_MENU_OFFSET}px !important; z-index:99998 !important;`;
    if (calendarPosition === 'top-right') {
        const bottom = PAGE_MENU_OFFSET + (floatMenuPosition === 'bottom-right' ? FLOAT_TOGGLE_CLEARANCE : 0);
        return [`.page-menu { ${base} bottom:${bottom}px !important; top:auto !important; }`];
    }
    if (calendarPosition === 'bottom-right') {
        const top = PAGE_MENU_OFFSET + (floatMenuPosition === 'top-right' ? FLOAT_TOGGLE_CLEARANCE : 0);
        return [`.page-menu { ${base} top:${top}px !important; bottom:auto !important; }`];
    }
    return [];
};

/* ページ整列とpage-menu位置をstyle要素にまとめて適用する（個別ページ遷移時にrouterから呼ばれる） */
const applyPageAlign = (align, calendarPosition, floatMenuPosition) => {
    const id = '__sb_page_align_style__';
    let styleEl = document.getElementById(id);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = [
        ...buildPageAlignCss(align),
        ...buildPageMenuCss(calendarPosition, floatMenuPosition),
    ].join('\n');
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

