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
    todoWidth: 320,
    todoHeight: 400,
    mainWidth: 480,
    mainHeight: 560,
    theme: 'normal',
    customColors: {},
    showPageCreate: 'auto',  // 'auto'(nkmr-labのみ) | 'show' | 'hide'
};

const getPanelSize = (settings, panelType) => {
    switch (panelType) {
        case 'calendar': return { width: settings.calendarWidth, height: settings.calendarHeight };
        case 'todo':     return { width: settings.todoWidth, height: settings.todoHeight };
        default:         return { width: settings.mainWidth, height: settings.mainHeight };
    }
};

const loadSettings = (projectName) => {
    return new Promise(resolve => {
        if (!projectName) {
            resolve({ ...DEFAULT_SETTINGS });
            return;
        }
        chrome.storage.local.get(
            { [settingsKey(projectName)]: DEFAULT_SETTINGS },
            data => resolve({ ...DEFAULT_SETTINGS, ...data[settingsKey(projectName)] })
        );
    });
};

const saveSettings = (projectName, settings) => {
    if (!projectName) return;
    chrome.storage.local.set({ [settingsKey(projectName)]: settings });
};

const initTheme = async (projectName) => {
    const settings = await loadSettings(projectName);
    applyTheme(settings);
    injectStyleSheet();
};

/* --- パネルにサイズ + フェード適用 --- */
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

/* ================= 設定画面 ================= */
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

const renderSettingsPanel = async (panelNode) => {
    panelNode.innerHTML = '';
    const settings = await loadSettings(currentProjectName);

    const sectionLabel = (text) => {
        const node = document.createElement('div');
        node.textContent = text;
        node.className = 'sb-settings-section';
        return node;
    };

    const field = (label, el) => {
        const wrap = document.createElement('div');
        wrap.className = 'sb-settings-field';
        const lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.className = 'sb-settings-label';
        wrap.append(lbl, el);
        return wrap;
    };

    const input = (v, type = 'text') => {
        const i = document.createElement('input');
        i.type = type; i.value = v; i.className = 'sb-input';
        return i;
    };

    const select = (value, options) => {
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

    const nameI = input(settings.userName);
    const todoI = input(settings.todoMark);
    const doneI = input(settings.doneMark);
    const oI = input(settings.idleOpacity, 'number');
    const apiKeyI = input(settings.openaiApiKey, 'password');
    apiKeyI.placeholder = 'sk-...';
    const todoPosI = select(settings.todoPosition, [
        ['side', '横（カレンダーの隣）'], ['below', '下（カレンダーの下）'],
    ]);
    const calWI = input(settings.calendarWidth, 'number');
    const calHI = input(settings.calendarHeight, 'number');
    const calFI = input(settings.calendarFontSize, 'number');
    const todoWI = input(settings.todoWidth, 'number');
    const todoHI = input(settings.todoHeight, 'number');
    const mainWI = input(settings.mainWidth, 'number');
    const mainHI = input(settings.mainHeight, 'number');
    const themeI = select(settings.theme, Object.entries(THEME_LABELS));
    const pageCreateI = select(settings.showPageCreate, [
        ['auto', '自動（nkmr-labのみ表示）'],
        ['show', '常に表示'],
        ['hide', '非表示'],
    ]);

    panelNode.append(
        sectionLabel('基本設定'),
        field('名前', nameI), field('TODO マーク', todoI), field('完了マーク', doneI),
        field('非アクティブ透明度', oI), field('OpenAI API Key', apiKeyI),
        sectionLabel('カレンダーパネル'),
        field('横幅', calWI), field('縦幅', calHI), field('文字サイズ(px)', calFI),
        sectionLabel('TODO パネル'),
        field('横幅', todoWI), field('縦幅', todoHI), field('位置', todoPosI),
        sectionLabel('メインパネル（議事録・論文紹介等）'),
        field('横幅', mainWI), field('縦幅', mainHI),
        sectionLabel('カラーテーマ'),
        field('テーマ', themeI),
        sectionLabel('フロートメニュー'),
        field('ページ生成メニュー', pageCreateI),
    );

    /* カスタムカラー */
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

    const toggleBtn = document.createElement('div');
    toggleBtn.textContent = '▶ カスタムカラー（詳細）';
    toggleBtn.className = 'sb-toggle-btn';
    toggleBtn.onclick = () => {
        const open = colorSection.style.display !== 'none';
        colorSection.style.display = open ? 'none' : '';
        toggleBtn.textContent = (open ? '▶' : '▼') + ' カスタムカラー（詳細）';
    };

    themeI.onchange = () => {
        const base = THEMES[themeI.value] || THEMES.normal;
        Object.entries(colorInputs).forEach(([key, textI]) => {
            textI.placeholder = base[key] || '';
            if (!textI.value) textI.previousElementSibling.value = base[key] || '#000000';
        });
    };

    panelNode.append(toggleBtn, colorSection);

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
            calendarFontSize: +calFI.value,
            todoWidth: +todoWI.value, todoHeight: +todoHI.value,
            mainWidth: +mainWI.value, mainHeight: +mainHI.value,
            theme: themeI.value, customColors: newCustom,
            showPageCreate: pageCreateI.value,
        });
        location.reload();
    };
    panelNode.appendChild(saveBtn);
};

const renderSettingsEntry = (panelNode) => {
    appendSectionHeader(panelNode, '\u3000⚙ 設定', () => renderSettingsPanel(panelNode));
};
