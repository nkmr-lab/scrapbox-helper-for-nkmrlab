const start = () => {
  if (window.__SB_EXTENSION_RUNNING__) return;
  window.__SB_EXTENSION_RUNNING__ = true;

  const clearUI = () => {
    document.getElementById(CALENDAR_ID)?.remove();
    document.getElementById(MAIN_PANEL_ID)?.remove();
    document.getElementById(TODO_PANEL_ID)?.remove();
  };

  const watcherManager = new WatcherManager();

  /* ================= SPA監視 ================= */
  const classifyPageByName = (pageName) => {
    if (!pageName) return 'project-top';
    if (/研究ノート/.test(pageName)) return 'research-note';
    if (/実験計画書/.test(pageName)) return 'experiment-plan';
    if (/発表練習/.test(pageName)) return 'presentation-training';
    if (/議事録/.test(pageName)) return 'minutes';
    return 'unknown';
  };

  const route = (projectName, pageName, json) => {
    const lines = normalizeLines(json.lines);
    if (isPaperIntroPage(lines)){
      //paperIntroWatcher.start(projectName, pageName);
      watcherManager.startPaperIntroWatcher(projectName, pageName);
    } else {
      //minutesWatcher.start(projectName, pageName);
      watcherManager.startMinutesWatcher(currentProjectName, pageName);
    }
  };

  let lastURL = null;

  const tick = async () => {
    if (!isExtensionAlive()) return;

    const url = location.pathname;
    if (url === lastURL) return;
    lastURL = url;

    clearUI();
    watcherManager.stopAllWatchers();
    closedPanels.clear();

    const match = location.pathname.match(/^\/([^/]+)(?:\/(.*))?$/);
    if (!match) return;

    currentProjectName = match[1];
    const pageName = match[2] ? decodeURIComponent(match[2]) : null;

    await loadUserNameCache(currentProjectName);
    saveHistory(currentProjectName, pageName);

    // プロジェクトトップ
    if (!pageName) {
      if (!isExtensionAlive()) return;
      renderProjectTop();
      return;
    }

    const type = classifyPageByName(pageName);
    if (type !== 'unknown') {
      const handlers = {
        'research-note': () => watcherManager.startResearchNoteWatcher(currentProjectName, pageName),
        'experiment-plan': () => renderExperimentPlan(pageName),
        'presentation-training': () => watcherManager.startPresentationTrainingWatcher(currentProjectName, pageName),
        'minutes': () => watcherManager.startMinutesWatcher(currentProjectName, pageName),
        'paper-intro': () => watcherManager.startPaperIntroWatcher(currentProjectName, pageName),
      };
      handlers[type]?.();
    } else {
      // ページあり
      const json = await fetchPage(currentProjectName, pageName);
      if (!isExtensionAlive()) return;
      if (!json) return;
      route(currentProjectName, pageName, json);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // stopAllWatchers();
      watcherManager.stopAllWatchers();
    } else {
      lastURL = null;
      tick();
    }
  });

  setInterval(tick, 600);
  tick();
};

start();
