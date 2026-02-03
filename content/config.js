/* ================= 設定 ================= */
const DEFAULT_SETTINGS = {
    userName: '',
    panelWidth: 480,
    panelHeight: 560,
    calendarFontSize: 11,
    idleOpacity: 0.35,
    todoMark: '[_]',      // TODO を示す文字列（正規表現ではない）
    doneMark: '[x]',       // 完了を示す文字列
    openaiApiKey: ''
};

const renderSettingsPanel = (panelNode) => {
    panelNode.innerHTML = '';

    loadSettings(currentProjectName, settings => {
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

        const nameI = input(settings.userName);
        const wI = input(settings.panelWidth, 'number');
        const hI = input(settings.panelHeight, 'number');
        const fI = input(settings.calendarFontSize, 'number');
        const oI = input(settings.idleOpacity, 'number');
        const todoI = input(settings.todoMark);
        const doneI = input(settings.doneMark);
        const apiKeyI = input(settings.openaiApiKey, 'password');
        apiKeyI.placeholder = 'sk-...';

        panelNode.append(
            field('名前', nameI),
            field('横幅', wI),
            field('縦幅', hI),
            field('TODO マーク', todoI),
            field('完了マーク', doneI),
            field('カレンダー文字サイズ(px)', fI),
            field('非アクティブ透明度', oI),
            field('OpenAI API Key', apiKeyI)
        );

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.onclick = () => {
            saveSettings(currentProjectName, {
                userName: nameI.value.trim(),
                panelWidth: +wI.value,
                panelHeight: +hI.value,
                calendarFontSize: +fI.value,
                idleOpacity: +oI.value,
                todoMark: todoI.value,
                doneMark: doneI.value,
                openaiApiKey: apiKeyI.value.trim() 
            });
            location.reload();
        };

        panelNode.appendChild(saveBtn);
    });
};

const loadSettings = (projectName, cb) => {
    if (!projectName) {
        cb({ ...DEFAULT_SETTINGS });
        return;
    }

    chrome.storage.local.get({
        [settingsKey(projectName)]: DEFAULT_SETTINGS },
        data => {
        //if (!isExtensionAlive()) return;
        cb({ ...DEFAULT_SETTINGS, ...data[settingsKey(projectName)] });
    });
};

const saveSettings = (projectName, settings) => {
    if (!projectName) return;
    chrome.storage.local.set({
        [settingsKey(projectName)]: settings
    });
};

const applyPanelSettings = (panelNode) => {
    let fadeTimer = null;

    loadSettings(
        currentProjectName, settings => {
        panelNode.style.width = settings.panelWidth + 'px';
        panelNode.style.maxHeight = settings.panelHeight + 'px';
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
        }, 5000);
        };
    });
};

const renderSettingsEntry = (panelNode) => {
    appendSectionHeader(panelNode, '　⚙ 設定', () => renderSettingsPanel(panelNode));
};