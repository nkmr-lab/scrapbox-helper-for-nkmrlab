/* ================= 設定画面（タブ式） ================= */
const THEME_LABELS = { normal: 'ノーマル', dark: 'ダーク' };

const COLOR_KEY_LABELS = {
    /* パネル全般 */
    panelBg:'パネル背景', panelBorder:'パネル枠線',
    titleBg:'タイトル背景', titleText:'タイトル文字',
    headerBg:'ヘッダー背景', headerText:'ヘッダー文字',
    sectionBg:'セクション背景（クリック可）', sectionStaticBg:'セクション背景（情報）',
    sectionBorder:'セクション枠線',
    subTitleBg:'サブタイトル背景',
    /* テキスト */
    text:'本文', textMuted:'薄い文字', textFaint:'最も薄い文字', textDone:'完了済み文字',
    border:'枠線',
    /* カレンダー */
    calCellBorder:'セル枠線', calSnippet:'スニペット文字',
    calSunday:'日曜', calSaturday:'土曜',
    calSundayHeader:'日曜ヘッダー', calSaturdayHeader:'土曜ヘッダー',
    calToday:'今日の枠',
    heatmap1:'ヒートマップ Lv1', heatmap2:'Lv2', heatmap3:'Lv3', heatmap4:'Lv4',
    /* TODO */
    todoBorder:'TODO行の区切り線',
    /* AI・レビュー */
    aiSummaryBg:'AI要約背景', aiSummaryBorder:'AI要約枠線',
    reviewOk:'レビューOK', reviewNg:'レビューNG',
    /* 統計 */
    statsBar:'統計バー', statsBarBg:'統計バー背景',
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

const _desc = (text) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.className = 'sb-tab-desc';
    return el;
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
/* 基本設定タブ（名前・メニュー設定）を構築する */
const _buildBasicTab = (settings) => {
    const nameI = _input(settings.userName);
    const pageCreateI = _select(settings.showPageCreate, [
        ['auto', '自動（nkmr-labのみ表示）'], ['show', '常に表示'], ['hide', '非表示'],
    ]);
    const floatPosI = _select(settings.floatMenuPosition, POSITION_OPTIONS);
    const floatWI = _input(settings.floatMenuWidth, 'number');
    const pageAlignI = _select(settings.pageAlign, [
        ['center', '中央（Scrapbox標準）'], ['left', '左寄せ'], ['right', '右寄せ'],
    ]);

    const basicContent = document.createElement('div');
    basicContent.append(
        _desc('拡張機能の全般的な設定です。'),
        _field('名前', nameI),
        _field('ページ生成メニュー', pageCreateI),
        _field('メニュー位置', floatPosI),
        _field('メニュー横幅', floatWI),
        _field('Scrapboxページの配置', pageAlignI),
    );

    return { basicContent, nameI, pageCreateI, floatPosI, floatWI, pageAlignI };
};

/* 同期タブ（Chrome同期の対象選択）を構築する */
const _buildSyncTab = (settings) => {
    const _checkbox = (label, checked) => {
        const wrap = document.createElement('label');
        wrap.className = 'sb-settings-field';
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '4px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = checked;
        const lbl = document.createElement('span');
        lbl.textContent = label;
        lbl.className = 'sb-settings-label';
        wrap.append(cb, lbl);
        return { wrap, cb };
    };

    const syncSystemI = _checkbox('システム設定（名前・マーク・プロンプト等）', settings.syncSystem);
    const syncDisplayI = _checkbox('表示設定（パネルサイズ・位置・テーマ・色等）', settings.syncDisplay);
    const syncPinnedI = _checkbox('ピン留め', settings.syncPinned);
    const syncHistoryI = _checkbox('閲覧履歴', settings.syncHistory);

    const syncContent = document.createElement('div');
    syncContent.append(
        _desc('Googleアカウントでログインしている場合、チェックした項目が他のPCと同期されます。'),
        syncSystemI.wrap, syncDisplayI.wrap,
        syncPinnedI.wrap, syncHistoryI.wrap,
    );

    return { syncContent,
        syncSystemCb: syncSystemI.cb, syncDisplayCb: syncDisplayI.cb,
        syncPinnedCb: syncPinnedI.cb, syncHistoryCb: syncHistoryI.cb };
};

/* 色設定タブ（テーマ・透明度・カスタムカラー）を構築する */
const _buildColorTab = (settings) => {
    const themeI = _select(settings.theme, Object.entries(THEME_LABELS));
    const oI = _input(settings.idleOpacity, 'number');

    const colorContent = document.createElement('div');
    colorContent.append(
        _desc('テーマの切替と、パネルの透明度・カスタムカラーの設定です。'),
        _field('非アクティブ透明度', oI),
        _field('テーマ', themeI),
    );

    const { colorToggle, colorSection, colorInputs } = _buildColorCustomizer(settings, themeI);
    colorContent.append(colorToggle, colorSection);

    return { colorContent, themeI, oI, colorInputs };
};

/* AIサポートタブ（APIキー・プロンプト）を構築する */
const _buildAiTab = (settings) => {
    const apiKeyI = _input(settings.openaiApiKey, 'password');
    apiKeyI.placeholder = 'sk-...';

    const aiContent = document.createElement('div');
    aiContent.append(
        _desc('AI要約・レビュー・プログラム変換に使用するOpenAI APIの設定です。'),
        _field('OpenAI API Key', apiKeyI),
    );

    const { promptToggle, promptSection, promptSummaryI, promptExperimentI, promptProgramI } =
        _buildPromptEditor(settings);

    const hasKey = !!settings.openaiApiKey;

    /* Keyがあれば展開、なければ無効化 */
    if (hasKey) {
        promptSection.style.display = '';
        promptToggle.textContent = '▼ AIプロンプト（詳細）';
    } else {
        promptToggle.textContent = '▶ AIプロンプト（API Key設定後に編集可能）';
        promptToggle.onclick = null;
        promptSummaryI.disabled = true;
        promptExperimentI.disabled = true;
        promptProgramI.disabled = true;
    }

    aiContent.append(promptToggle, promptSection);

    return { aiContent, apiKeyI, promptSummaryI, promptExperimentI, promptProgramI };
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

/* AIプロンプト編集UI（折りたたみ）を構築する */
const _buildPromptEditor = (settings) => {
    const promptSection = document.createElement('div');
    promptSection.style.display = 'none';

    const _promptField = (label, value, placeholder) => {
        const wrap = document.createElement('div');
        wrap.className = 'sb-settings-field';
        const lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.className = 'sb-settings-label';
        const ta = document.createElement('textarea');
        ta.className = 'sb-textarea';
        ta.value = value || '';
        ta.placeholder = placeholder;
        wrap.append(lbl, ta);
        return { wrap, ta };
    };

    const s = _promptField('感想要約プロンプト', settings.promptSummary, SUMMARY_PROMPT.trim());
    const e = _promptField('実験計画レビュープロンプト', settings.promptExperimentReview, EXPERIMENT_REVIEW_PROMPT.trim());
    const p = _promptField('プログラム変換プロンプト', settings.promptProgramParse, PROGRAM_PARSE_PROMPT.trim());

    promptSection.append(s.wrap, e.wrap, p.wrap);

    const promptToggle = document.createElement('div');
    promptToggle.textContent = '▶ AIプロンプト（詳細）';
    promptToggle.className = 'sb-toggle-btn';
    promptToggle.onclick = () => {
        const open = promptSection.style.display !== 'none';
        promptSection.style.display = open ? 'none' : '';
        promptToggle.textContent = (open ? '▶' : '▼') + ' AIプロンプト（詳細）';
    };

    return { promptToggle, promptSection, promptSummaryI: s.ta, promptExperimentI: e.ta, promptProgramI: p.ta };
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
        _desc('研究ノートのカレンダーパネルの設定です。'),
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
        _desc('研究ノートのTODOパネルの設定です。'),
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
    const recentI = _input(settings.recentPagesCount, 'number');
    const frequentI = _input(settings.frequentPagesCount, 'number');

    const mainContent = document.createElement('div');
    mainContent.append(
        _desc('プロジェクトのトップページに表示されるパネルの設定です。'),
        _field('位置', mainPosI),
        _field('横幅', mainWI), _field('縦幅', mainHI),
        _field('最近見たページ表示数（0で非表示）', recentI),
        _field('よく見るページ表示数（0で非表示）', frequentI),
    );

    return { mainContent, mainPosI, mainWI, mainHI, recentI, frequentI };
};

/* その他パネル設定タブを構築する */
const _buildOtherTab = (settings) => {
    const otherPosI = _select(settings.otherPosition, POSITION_OPTIONS);
    const otherWI = _input(settings.otherWidth, 'number');
    const otherHI = _input(settings.otherHeight, 'number');

    const otherContent = document.createElement('div');
    otherContent.append(
        _desc('議事録・論文紹介・発表練習・実験計画書など、個別ページに表示されるパネルの設定です。'),
        _field('位置', otherPosI),
        _field('横幅', otherWI), _field('縦幅', otherHI),
    );

    return { otherContent, otherPosI, otherWI, otherHI };
};

/* 全入力要素から設定値オブジェクトを収集する */
const _collectSettingsValues = ({
    nameI, pageCreateI, floatPosI, floatWI, pageAlignI,
    syncSystemCb, syncDisplayCb, syncPinnedCb, syncHistoryCb,
    themeI, oI, colorInputs,
    calPosI, calWI, calHI, calFI, calFEI, calHeatI,
    todoI, doneI, todoPosI, todoWI, todoHI, todoShowI,
    mainPosI, mainWI, mainHI, recentI, frequentI,
    otherPosI, otherWI, otherHI,
    apiKeyI, promptSummaryI, promptExperimentI, promptProgramI,
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
        pageAlign: pageAlignI.value,
        recentPagesCount: +recentI.value,
        frequentPagesCount: +frequentI.value,
        showPageCreate: pageCreateI.value,
        promptSummary: promptSummaryI.value.trim(),
        promptExperimentReview: promptExperimentI.value.trim(),
        promptProgramParse: promptProgramI.value.trim(),
        syncSystem: syncSystemCb.checked,
        syncDisplay: syncDisplayCb.checked,
        syncPinned: syncPinnedCb.checked,
        syncHistory: syncHistoryCb.checked,
    };
};

/* --- メイン --- */
/* 設定モーダルを開いてタブ式UIを表示する */
const openSettingsModal = async () => {
    const settings = await loadSettings(currentProjectName);
    const { overlay, modal } = createModalDialog(SETTINGS_MODAL_ID, '⚙ 設定');
    const panelNode = modal;

    /* ===== タブ構築 ===== */
    const basic = _buildBasicTab(settings);
    const main = _buildMainTab(settings);
    const cal = _buildCalendarTab(settings);
    const todo = _buildTodoTab(settings);
    const other = _buildOtherTab(settings);
    const color = _buildColorTab(settings);
    const sync = _buildSyncTab(settings);
    const ai = _buildAiTab(settings);

    /* ===== タブ組み立て ===== */
    const { bar, panels } = renderTabs([
        { label: '基本', content: basic.basicContent },
        { label: 'メイン', content: main.mainContent },
        { label: 'カレンダー', content: cal.calContent },
        { label: 'TODO', content: todo.todoContent },
        { label: '他ページ', content: other.otherContent },
        { label: '色', content: color.colorContent },
        { label: '同期', content: sync.syncContent },
        { label: 'AI', content: ai.aiContent },
    ]);

    panelNode.append(bar, ...panels);

    /* 保存ボタン */
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'sb-save-btn';
    saveBtn.onclick = () => {
        const newSettings = _collectSettingsValues({
            ...basic, ...main, ...cal, ...todo, ...other, ...color, ...sync, ...ai,
        });
        saveSettings(currentProjectName, newSettings);
        location.reload();
    };
    panelNode.appendChild(saveBtn);

    document.body.appendChild(overlay);
};
