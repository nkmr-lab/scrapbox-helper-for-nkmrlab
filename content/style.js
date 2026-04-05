/* ================= Style Registry ================= */

const Styles = {
    panel: {
        base: `
            position:fixed;
            top:10px;
            right:10px;
            background:#fff;
            border:1px solid #111;
            box-shadow:0 2px 10px rgba(0,0,0,.25);
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
            border-bottom:1px solid #ddd;
            background:#555;
            color: #eee;
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
            border:1px dashed #ccc;
            font-size:11px;
            background:#fafafa;
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
            color: #eee;
            background: #111;
        `,
        sectionTitle: `
            font-weight:bold;
            margin:6px 0;
            border-bottom:1px solid #000;
            padding-left:5px;
            padding-top:3px;
            padding-bottom:3px;
            cursor:pointer;
            background: #fcc;
        `,
        subTitle: `
            margin-bottom:4px;
            padding-bottom:3px;
            background: #ddf;
        `,
        item: `
            cursor:pointer;
            padding-left:6px;
        `,
        muted: `
            color:#666;
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

/* よく使う組み合わせ */
const ITEM_STYLE = [Styles.text.item, Styles.list.ellipsis].join('');
const ITEM_STYLE_MUTED = [Styles.text.item, Styles.list.ellipsis, 'color:#555;'].join('');
const ITEM_STYLE_SUB = [Styles.text.item, Styles.list.ellipsis, Styles.text.subTitle].join('');

const applyStyle = (el, ...styles) => {
    el.style.cssText = styles.join('');
};
