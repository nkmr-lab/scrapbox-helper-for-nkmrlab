  /* ================= トップページ ================= */
  const renderMyResearchNote = (panelNode, setting) => {
    if (!setting.userName) return;
    const date = new Date();

    const ym = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    const pageName = `${ym}_研究ノート_${setting.userName}`;
    appendSectionHeader(panelNode, '🧑 自分の研究ノート');
    appendTextNode(panelNode, '📅 ' + pageName, [Styles.text.item, Styles.list.ellipsis].join(""), () => location.assign(`/${currentProjectName}/${encodeURIComponent(pageName)}`));
  };

  const renderProjectTop = () => {
    const projectName = currentProjectName;

    chrome.storage.local.get(
      { [historyKey(projectName)]: [] },
      data => {
        if (!isExtensionAlive()) return;
        loadSettings(projectName, setting => {
          if (!isExtensionAlive()) return;
          if (projectName !== currentProjectName) return;

          const history = normalizeHistoryEntries(
            data[historyKey(projectName)]
          );

          const panelNode = getOrCreatePanel(
            MAIN_PANEL_ID,
            () => {
              const parent = document.createElement('div');
              applyStyle(parent, Styles.panel.base, Styles.panelMain);
              applyPanelSettings(parent);
              attachCloseButton(parent, MAIN_PANEL_ID);
              appendPanelTitle(parent, "Project: " + currentProjectName);
              return parent;
            }
          );

          renderMyResearchNote(panelNode, setting);
          renderFrequentPages(panelNode, history);
          renderHistory(panelNode, history);
          renderSettingsEntry(panelNode);

          document.body.appendChild(panelNode);
        });
      }
    );
  };