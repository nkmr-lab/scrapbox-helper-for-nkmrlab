/* ================= テーマ定義 + CSS 注入 ================= */

/* --- テーマプリセット（CSS変数値のマップ） --- */
const THEMES = {
    normal: {
        panelBg:'#fff', panelBorder:'#111', panelShadow:'rgba(0,0,0,.25)',
        headerBg:'#555', headerText:'#eee',
        titleBg:'#111', titleText:'#eee',
        sectionBg:'#fcc', sectionBorder:'#000',
        subTitleBg:'#ddf',
        text:'#333', textMuted:'#555', textFaint:'#666', textDone:'#999',
        border:'#ddd',
        createUiBg:'#fafafa', createUiBorder:'#ccc',
        calCellBorder:'#ddd', calSnippet:'#555',
        calSunday:'#c00', calSaturday:'#06c',
        calSundayHeader:'#f00', calSaturdayHeader:'#00f',
        calToday:'rgba(255,0,0,1)',
        heatmap1:'rgba(0,150,0,0.10)', heatmap2:'rgba(0,150,0,0.20)',
        heatmap3:'rgba(0,150,0,0.35)', heatmap4:'rgba(0,150,0,0.55)',
        todoBorder:'#eee',
        aiSummaryBg:'#f7f7f7', aiSummaryBorder:'#ccc',
        reviewOk:'#4caf50', reviewNg:'#f44336',
        statsBar:'#4caf50', statsBarBg:'#fff',
        btnText:'#888', inputLabel:'#555',
    },
    dark: {
        panelBg:'#1e1e1e', panelBorder:'#555', panelShadow:'rgba(0,0,0,.5)',
        headerBg:'#333', headerText:'#ddd',
        titleBg:'#2a2a2a', titleText:'#ddd',
        sectionBg:'#3a2020', sectionBorder:'#666',
        subTitleBg:'#1e2a3a',
        text:'#ccc', textMuted:'#999', textFaint:'#888', textDone:'#666',
        border:'#444',
        createUiBg:'#2a2a2a', createUiBorder:'#555',
        calCellBorder:'#444', calSnippet:'#999',
        calSunday:'#f66', calSaturday:'#6af',
        calSundayHeader:'#f66', calSaturdayHeader:'#6af',
        calToday:'rgba(255,80,80,1)',
        heatmap1:'rgba(0,180,0,0.15)', heatmap2:'rgba(0,180,0,0.25)',
        heatmap3:'rgba(0,180,0,0.40)', heatmap4:'rgba(0,180,0,0.60)',
        todoBorder:'#333',
        aiSummaryBg:'#2a2a2a', aiSummaryBorder:'#555',
        reviewOk:'#4caf50', reviewNg:'#f44336',
        statsBar:'#4caf50', statsBarBg:'#333',
        btnText:'#aaa', inputLabel:'#999',
    }
};

/* --- CSS変数をルートに適用 --- */
const applyTheme = (settings) => {
    const base = THEMES[settings.theme] || THEMES.normal;
    const merged = { ...base, ...(settings.customColors || {}) };
    const root = document.documentElement;
    Object.entries(merged).forEach(([k, v]) => {
        root.style.setProperty(`--sb-${k}`, v);
    });
};

/* --- スタイルシート注入（一度だけ） --- */
const SB_STYLE_ID = '__sb_injected_style__';

const injectStyleSheet = () => {
    if (document.getElementById(SB_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SB_STYLE_ID;
    style.textContent = `
/* ===== Panel ===== */
.sb-panel {
    position:fixed; top:10px; right:10px;
    background:var(--sb-panelBg); color:var(--sb-text);
    border:1px solid var(--sb-panelBorder);
    box-shadow:0 2px 10px var(--sb-panelShadow);
    z-index:99999; font:12px/1.5 sans-serif;
    overflow:auto; transition:opacity .2s;
}
.sb-panel-calendar {
    display:flex; flex-direction:column;
}
.sb-panel-calendar-expanded {
    top:2vh; left:2vw; right:2vw; bottom:2vh;
    width:auto; height:auto; max-width:none; max-height:none;
}

/* ===== Text ===== */
.sb-title {
    font-weight:bold; font-size:14px;
    padding:3px 5px 6px; cursor:pointer;
    color:var(--sb-titleText); background:var(--sb-titleBg);
}
.sb-section {
    font-weight:bold; margin:6px 0;
    border-bottom:1px solid var(--sb-sectionBorder);
    padding:3px 5px; cursor:pointer;
    background:var(--sb-sectionBg);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.sb-subtitle {
    margin-bottom:4px; padding-bottom:3px;
    background:var(--sb-subTitleBg);
}
.sb-item {
    cursor:pointer; padding-left:6px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.sb-item--muted { color:var(--sb-textMuted); }
.sb-item--sub { background:var(--sb-subTitleBg); margin-bottom:4px; padding-bottom:3px; }
.sb-muted { color:var(--sb-textFaint); font-size:11px; }

/* ===== Buttons ===== */
.sb-close-btn {
    font-weight:bold; position:absolute; top:4px; right:6px;
    cursor:pointer; font-size:14px; color:var(--sb-titleText);
}
.sb-settings-btn {
    position:absolute; top:4px; right:24px;
    cursor:pointer; font-size:14px; color:var(--sb-titleText);
}
.sb-btn { cursor:pointer; }

/* ===== Calendar ===== */
.sb-cal-header {
    padding:6px; font-weight:bold;
    border-bottom:1px solid var(--sb-border);
    background:var(--sb-headerBg); color:var(--sb-headerText);
    display:flex; align-items:center; gap:8px;
}
.sb-cal-grid {
    flex:1; min-height:0; padding:6px;
    display:grid; grid-template-columns:repeat(7,1fr);
    grid-template-rows:auto repeat(6,1fr); gap:2px;
}
.sb-cal-grid--expanded {
    grid-template-rows:auto repeat(6, minmax(140px, 1fr)); gap:8px;
}
.sb-cal-weekday { font-weight:bold; text-align:center; }
.sb-cal-weekday--sun { color:var(--sb-calSundayHeader); }
.sb-cal-weekday--sat { color:var(--sb-calSaturdayHeader); }
.sb-cal-cell {
    border:1px solid var(--sb-calCellBorder); padding:2px; cursor:pointer;
    display:flex; flex-direction:column; gap:2px; overflow:hidden; min-height:0;
}
.sb-cal-cell--today { box-shadow:inset 0 0 0 2px var(--sb-calToday); }
.sb-cal-cell--sun { color:var(--sb-calSunday); }
.sb-cal-cell--sat { color:var(--sb-calSaturday); }
.sb-cal-day { font-weight:bold; line-height:1; }
.sb-cal-snippet {
    font-size:0.9em; color:var(--sb-calSnippet);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0;
}
.sb-cal-create-ui {
    margin:6px; padding:6px;
    border:1px dashed var(--sb-createUiBorder);
    font-size:11px; background:var(--sb-createUiBg);
}

/* ===== TODO ===== */
.sb-todo-row {
    cursor:pointer; padding:4px 6px;
    border-bottom:1px solid var(--sb-todoBorder);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.sb-todo-row--done { color:var(--sb-textDone); text-decoration:line-through; }

/* ===== Stats ===== */
.sb-stats-row { display:flex; align-items:center; margin:4px 0; overflow:hidden; }
.sb-stats-label {
    width:5em; font-size:11px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.sb-stats-right { flex:1; display:flex; align-items:center; gap:6px; overflow:hidden; }
.sb-stats-bar-wrap { flex:1; background:var(--sb-statsBarBg); height:6px; overflow:hidden; }
.sb-stats-bar { background:var(--sb-statsBar); height:100%; }
.sb-stats-value { font-size:11px; min-width:2em; text-align:right; flex-shrink:0; }

/* ===== AI / Review ===== */
.sb-ai-btn { cursor:pointer; color:var(--sb-btnText); margin-left:4px; }
.sb-ai-summary {
    margin:4px 0 6px 1.5em; padding:4px 6px;
    background:var(--sb-aiSummaryBg); font-size:11px;
    border-left:3px solid var(--sb-aiSummaryBorder);
    white-space:pre-line;
}
.sb-review-box {
    margin:4px 12px 8px 12px; padding:6px;
    border-left:3px solid var(--sb-aiSummaryBorder);
    font-size:12px; white-space:pre-wrap;
}
.sb-review-box--ok { border-left-color:var(--sb-reviewOk); }
.sb-review-box--ng { border-left-color:var(--sb-reviewNg); }
.sb-batch-ui { margin:4px 0 8px 0; padding:6px 0; border-bottom:1px solid var(--sb-border); }
.sb-batch-status { margin-left:10px; font-size:11px; color:var(--sb-textFaint); }

/* ===== Settings ===== */
.sb-settings-section {
    font-weight:bold; margin-top:10px; margin-bottom:4px;
    border-bottom:1px solid var(--sb-border); padding-bottom:2px; font-size:12px;
}
.sb-settings-field { margin-bottom:6px; }
.sb-settings-label { font-size:11px; color:var(--sb-inputLabel); }
.sb-color-label { font-size:10px; color:var(--sb-inputLabel); width:7em; flex-shrink:0; }
.sb-toggle-btn { cursor:pointer; font-size:11px; color:var(--sb-textMuted); margin:4px 0; }
.sb-create-msg { margin-bottom:6px; color:var(--sb-textMuted); }

/* ===== Layout helpers ===== */
.sb-flex-spacer { margin-left:auto; }
.sb-row { display:flex; gap:4px; align-items:center; }
.sb-color-row { display:flex; align-items:center; gap:4px; margin-bottom:3px; }
`;
    document.head.appendChild(style);
};

/* デフォルトテーマで CSS 変数を初期化 + スタイルシート注入 */
applyTheme({ theme: 'normal', customColors: {} });
injectStyleSheet();
