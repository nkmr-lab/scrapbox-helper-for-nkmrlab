/* ================= 設定 ================= */
const DEFAULT_SETTINGS = {
    userName: '',
    idleOpacity: 0.35,
    todoMark: '[_]',
    doneMark: '[x]',
    todoPosition: 'side',       // 'side'（カレンダーの横）| 'below'（カレンダーの下）
    openaiApiKey: '',
    calendarWidth: 480,
    calendarHeight: 560,
    calendarFontSize: 11,
    todoWidth: 320,
    todoHeight: 400,
    mainWidth: 480,
    mainHeight: 560,
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
            data => {
                resolve({ ...DEFAULT_SETTINGS, ...data[settingsKey(projectName)] });
            }
        );
    });
};

const saveSettings = (projectName, settings) => {
    if (!projectName) return;
    chrome.storage.local.set({
        [settingsKey(projectName)]: settings
    });
};

/* --- パネルにサイズ + フェードを適用 --- */
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
        if (fadeTimer) {
            clearTimeout(fadeTimer);
            fadeTimer = null;
        }
        panelNode.style.opacity = '1';
    };

    panelNode.onmouseleave = () => {
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
            panelNode.style.opacity = settings.idleOpacity;
        }, FADE_TIMEOUT);
    };
};

/* --- 設定画面 --- */
const renderSettingsPanel = async (panelNode) => {
    panelNode.innerHTML = '';

    const settings = await loadSettings(currentProjectName);

    const sectionLabel = (text) => {
        const node = document.createElement('div');
        node.textContent = text;
        node.style = 'font-weight:bold;margin-top:10px;margin-bottom:4px;border-bottom:1px solid #ddd;padding-bottom:2px;font-size:12px';
        return node;
    };

    const field = (label, el) => {
        const itemNode = document.createElement('div');
        itemNode.style = 'margin-bottom:6px';
        const labelNode = document.createElement('div');
        labelNode.textContent = label;
        labelNode.style = 'font-size:11px;color:#555';
        itemNode.append(labelNode, el);
        return itemNode;
    };

    const input = (v, type = 'text') => {
        const i = document.createElement('input');
        i.type = type;
        i.value = v;
        i.style = 'width:100%';
        return i;
    };

    const select = (value, options) => {
        const s = document.createElement('select');
        s.style = 'width:100%';
        options.forEach(([val, label]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            if (val === value) opt.selected = true;
            s.appendChild(opt);
        });
        return s;
    };

    /* 基本設定 */
    const nameI = input(settings.userName);
    const todoI = input(settings.todoMark);
    const doneI = input(settings.doneMark);
    const oI = input(settings.idleOpacity, 'number');
    const apiKeyI = input(settings.openaiApiKey, 'password');
    apiKeyI.placeholder = 'sk-...';
    const todoPosI = select(settings.todoPosition, [
        ['side', '横（カレンダーの隣）'],
        ['below', '下（カレンダーの下）'],
    ]);

    /* カレンダー */
    const calWI = input(settings.calendarWidth, 'number');
    const calHI = input(settings.calendarHeight, 'number');
    const calFI = input(settings.calendarFontSize, 'number');

    /* TODO */
    const todoWI = input(settings.todoWidth, 'number');
    const todoHI = input(settings.todoHeight, 'number');

    /* メイン */
    const mainWI = input(settings.mainWidth, 'number');
    const mainHI = input(settings.mainHeight, 'number');

    panelNode.append(
        sectionLabel('基本設定'),
        field('名前', nameI),
        field('TODO マーク', todoI),
        field('完了マーク', doneI),
        field('非アクティブ透明度', oI),
        field('OpenAI API Key', apiKeyI),

        sectionLabel('カレンダーパネル'),
        field('横幅', calWI),
        field('縦幅', calHI),
        field('文字サイズ(px)', calFI),

        sectionLabel('TODO パネル'),
        field('横幅', todoWI),
        field('縦幅', todoHI),
        field('位置', todoPosI),

        sectionLabel('メインパネル（議事録・論文紹介等）'),
        field('横幅', mainWI),
        field('縦幅', mainHI),
    );

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.style = 'margin-top:8px';
    saveBtn.onclick = () => {
        saveSettings(currentProjectName, {
            userName: nameI.value.trim(),
            idleOpacity: +oI.value,
            todoMark: todoI.value,
            doneMark: doneI.value,
            todoPosition: todoPosI.value,
            openaiApiKey: apiKeyI.value.trim(),
            calendarWidth: +calWI.value,
            calendarHeight: +calHI.value,
            calendarFontSize: +calFI.value,
            todoWidth: +todoWI.value,
            todoHeight: +todoHI.value,
            mainWidth: +mainWI.value,
            mainHeight: +mainHI.value,
        });
        location.reload();
    };

    panelNode.appendChild(saveBtn);
};

const renderSettingsEntry = (panelNode) => {
    appendSectionHeader(panelNode, '\u3000\u2699 設定', () => renderSettingsPanel(panelNode));
};
