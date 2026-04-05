/* ================= テーマ・カラー定義 ================= */

const THEMES = {
    normal: {
        panelBg:          '#fff',
        panelBorder:      '#111',
        panelShadow:      'rgba(0,0,0,.25)',
        headerBg:         '#555',
        headerText:       '#eee',
        titleBg:          '#111',
        titleText:        '#eee',
        sectionBg:        '#fcc',
        sectionBorder:    '#000',
        subTitleBg:       '#ddf',
        text:             '#333',
        textMuted:        '#555',
        textFaint:        '#666',
        textDone:         '#999',
        border:           '#ddd',
        borderStrong:     '#000',
        createUiBg:       '#fafafa',
        createUiBorder:   '#ccc',
        calCellBorder:    '#ddd',
        calSnippet:       '#555',
        calSunday:        '#c00',
        calSaturday:      '#06c',
        calSundayHeader:  '#f00',
        calSaturdayHeader:'#00f',
        calToday:         'rgba(255,0,0,1)',
        heatmap1:         'rgba(0,150,0,0.10)',
        heatmap2:         'rgba(0,150,0,0.20)',
        heatmap3:         'rgba(0,150,0,0.35)',
        heatmap4:         'rgba(0,150,0,0.55)',
        todoBorder:       '#eee',
        aiSummaryBg:      '#f7f7f7',
        aiSummaryBorder:  '#ccc',
        reviewOk:         '#4caf50',
        reviewNg:         '#f44336',
        statsBar:         '#4caf50',
        statsBarBg:       '#fff',
        btnText:          '#888',
        inputLabel:       '#555',
    },
    dark: {
        panelBg:          '#1e1e1e',
        panelBorder:      '#555',
        panelShadow:      'rgba(0,0,0,.5)',
        headerBg:         '#333',
        headerText:       '#ddd',
        titleBg:          '#2a2a2a',
        titleText:        '#ddd',
        sectionBg:        '#3a2020',
        sectionBorder:    '#666',
        subTitleBg:       '#1e2a3a',
        text:             '#ccc',
        textMuted:        '#999',
        textFaint:        '#888',
        textDone:         '#666',
        border:           '#444',
        borderStrong:     '#888',
        createUiBg:       '#2a2a2a',
        createUiBorder:   '#555',
        calCellBorder:    '#444',
        calSnippet:       '#999',
        calSunday:        '#f66',
        calSaturday:      '#6af',
        calSundayHeader:  '#f66',
        calSaturdayHeader:'#6af',
        calToday:         'rgba(255,80,80,1)',
        heatmap1:         'rgba(0,180,0,0.15)',
        heatmap2:         'rgba(0,180,0,0.25)',
        heatmap3:         'rgba(0,180,0,0.40)',
        heatmap4:         'rgba(0,180,0,0.60)',
        todoBorder:       '#333',
        aiSummaryBg:      '#2a2a2a',
        aiSummaryBorder:  '#555',
        reviewOk:         '#4caf50',
        reviewNg:         '#f44336',
        statsBar:         '#4caf50',
        statsBarBg:       '#333',
        btnText:          '#aaa',
        inputLabel:       '#999',
    }
};

/* 現在のテーマ（applyTheme で上書きされる） */
let Theme = { ...THEMES.normal };

const applyTheme = (settings) => {
    const base = THEMES[settings.theme] || THEMES.normal;
    Theme = { ...base, ...(settings.customColors || {}) };
    rebuildStyles();
};

/* ================= Style Registry ================= */

let Styles = {};
let ITEM_STYLE = '';
let ITEM_STYLE_MUTED = '';
let ITEM_STYLE_SUB = '';

const rebuildStyles = () => {
    Styles = {
        panel: {
            base: `
                position:fixed;
                top:10px;
                right:10px;
                background:${Theme.panelBg};
                color:${Theme.text};
                border:1px solid ${Theme.panelBorder};
                box-shadow:0 2px 10px ${Theme.panelShadow};
                z-index:99999;
                font:12px/1.5 sans-serif;
                overflow:auto;
                transition:opacity .2s;
            `,
        },

        panelCalendar: `
            display:flex;
            flex-direction:column;
        `,

        panelCalendarExpanded: `
            top: 2vh;
            left: 2vw;
            right: 2vw;
            bottom: 2vh;
            width: auto;
            height: auto;
            max-width: none;
            max-height: none;
        `,

        calendar: {
            header: `
                padding:6px;
                font-weight:bold;
                border-bottom:1px solid ${Theme.border};
                background:${Theme.headerBg};
                color:${Theme.headerText};
                display:flex;
                align-items:center;
                gap:8px;
            `,
            grid: `
                flex:1;
                min-height:0;
                padding:6px;
                display:grid;
                grid-template-columns:repeat(7,1fr);
                grid-template-rows:auto repeat(6,1fr);
                gap:2px;
            `,
            gridExpanded: `
                grid-template-rows: auto repeat(6, minmax(140px, 1fr));
                gap: 8px;
            `,
            createUI: `
                margin:6px;
                padding:6px;
                border:1px dashed ${Theme.createUiBorder};
                font-size:11px;
                background:${Theme.createUiBg};
            `
        },

        text: {
            panelTitle: `
                font-weight:bold;
                font-size:14px;
                padding-left:5px;
                padding-top:3px;
                padding-bottom:6px;
                cursor:pointer;
                color:${Theme.titleText};
                background:${Theme.titleBg};
            `,
            sectionTitle: `
                font-weight:bold;
                margin:6px 0;
                border-bottom:1px solid ${Theme.sectionBorder};
                padding-left:5px;
                padding-top:3px;
                padding-bottom:3px;
                cursor:pointer;
                background:${Theme.sectionBg};
            `,
            subTitle: `
                margin-bottom:4px;
                padding-bottom:3px;
                background:${Theme.subTitleBg};
            `,
            item: `
                cursor:pointer;
                padding-left:6px;
            `,
            muted: `
                color:${Theme.textFaint};
                font-size:11px;
            `
        },

        list: {
            ellipsis: `
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
            `
        }
    };

    ITEM_STYLE = [Styles.text.item, Styles.list.ellipsis].join('');
    ITEM_STYLE_MUTED = [Styles.text.item, Styles.list.ellipsis, `color:${Theme.textMuted};`].join('');
    ITEM_STYLE_SUB = [Styles.text.item, Styles.list.ellipsis, Styles.text.subTitle].join('');
};

const applyStyle = (el, ...styles) => {
    el.style.cssText = styles.join('');
};

/* 初期値で一度ビルド */
rebuildStyles();
