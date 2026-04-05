/* ================= 定数・グローバル状態 ================= */

/* --- Panel IDs --- */
const TODO_PANEL_ID = '__sb_todo_panel__';
const MAIN_PANEL_ID = '__sb_final_panel__';
const MAIN_BODY_ID = '__sb_panel_body__';
const MAIN_TITLE_ID = '__sb_panel_title__';
const CALENDAR_ID = '__sb_calendar_panel__';
const CALENDAR_GRID_CLASS = '__sb_calendar_grid__';
const CALENDAR_CREATE_UI_ID = '__sb_create_note_ui__';
const FLOAT_MENU_ID = '__sb_float_menu__';

/* nkmr-lab プロジェクト判定 */
const isNkmrLabProject = () => currentProjectName === 'nkmr-lab';

/* --- Storage Keys --- */
const settingsKey = projectName => `sb:${projectName}:settings`;
const historyKey = projectName => `sb:${projectName}:history`;
const userMapKey = projectName => `sb:${projectName}:userMap`;

/* --- Timing (ms) --- */
const TICK_INTERVAL = 600;
const FADE_TIMEOUT = 5000;

/* --- Display --- */
const TODO_SHOW_COUNT = 5;
const HISTORY_LIMIT = 100;
const RECENT_PAGES_LIMIT = 10;
const FREQUENT_PAGES_LIMIT = 5;
const CALENDAR_SNIPPET_LIMIT = 10;

/* --- Global State --- */
const closedPanels = new Set();
let currentProjectName = null;
