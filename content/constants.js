/* ================= 定数・グローバル状態 ================= */

/* --- Panel IDs --- */
const TODO_PANEL_ID = '__sb_todo_panel__';
const MAIN_PANEL_ID = '__sb_final_panel__';
const MAIN_BODY_ID = '__sb_panel_body__';
const MAIN_TITLE_ID = '__sb_panel_title__';
const CALENDAR_PANEL_ID = '__sb_calendar_panel__';
const CALENDAR_GRID_CLASS = '__sb_calendar_grid__';
const CALENDAR_CREATE_UI_ID = '__sb_create_note_ui__';
const FLOAT_MENU_ID = '__sb_float_menu__';
const SETTINGS_MODAL_ID = '__sb_settings_modal__';
const PAGE_CREATE_MODAL_ID = '__sb_page_create_modal__';
const TIMER_WIDGET_ID = '__sb_timer_widget__';

/* --- Timer State/Prefs Key (ユーザー単位のローカルセッション状態、per-project にはしない) --- */
const TIMER_STATE_KEY = '__sb_timer_state__';
const TIMER_PREFS_KEY = '__sb_timer_prefs__';

/* nkmr-lab プロジェクト判定 */
const isNkmrLabProject = () => currentProjectName === 'nkmr-lab';

/* --- Storage Keys --- */
const settingsKey = projectName => `sb:${projectName}:settings`;
const historyKey = projectName => `sb:${projectName}:history`;
const userMapKey = projectName => `sb:${projectName}:userMap`;
const pinnedKey = projectName => `sb:${projectName}:pinned`;

/* --- Timing (ms) --- */
const TICK_INTERVAL = 600;
const WATCHER_INTERVAL = 10000;
const COLLABORATORS_REFRESH_INTERVAL = 60000;
const FADE_TIMEOUT = 5000;

/* --- Display --- */
const TODO_SHOW_COUNT = 5;
const HISTORY_LIMIT = 100;
const RECENT_PAGES_LIMIT = 10;
const FREQUENT_PAGES_LIMIT = 5;
const CALENDAR_SNIPPET_LIMIT = 10;

/* --- Layout --- */
const PAGE_MENU_OFFSET = 16;          /* 画面端からの基本マージン (px) */
const FLOAT_TOGGLE_CLEARANCE = 40;    /* フロートメニュー☰ボタンの高さ+余白 (px) */

/* --- Global State --- */
const _closedPanels = new Set();
let currentProjectName = null;

/* --- Storage ヘルパー --- */
/* sync設定に基づいてストレージを選択する（設定キャッシュから判定） */
const getStorage = (syncEnabled) => {
    if (!syncEnabled) return chrome.storage.local;
    try {
        return chrome.storage.sync || chrome.storage.local;
    } catch {
        return chrome.storage.local;
    }
};

/* chrome.storage から1キーを読み、必要なら値を変換して返すPromiseを返す */
const loadFromStorage = (storage, key, defaultValue, transform = null) => {
    return new Promise(resolve => {
        storage.get({ [key]: defaultValue }, data => {
            const value = data[key] ?? defaultValue;
            resolve(transform ? transform(value) : value);
        });
    });
};

/* 拡張機能が実行中かどうかを判定する */
const isExtensionAlive = () => !!window.__SB_EXTENSION_RUNNING__;
