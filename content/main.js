const start = () => {
  if (window.__SB_EXTENSION_RUNNING__) return;
  window.__SB_EXTENSION_RUNNING__ = true;

  const clearUI = () => {
    document.getElementById(CALENDAR_ID)?.remove();
    document.getElementById(MAIN_PANEL_ID)?.remove();
    document.getElementById(TODO_PANEL_ID)?.remove();
  };

  /* =============== Watcher ========================= */
  const paperIntroWatcher = new PageWatcher({
    fetchPage,
    headPageETag,

    onInit: ({ pageName, json }) => {
      if (!isPaperIntroPage(json.lines)) return;
      renderPaperPanelFromLines(pageName, json.lines);
    },

    onUpdate: ({ pageName, json }) => {
      if (!isPaperIntroPage(json.lines)) return;
      renderPaperPanelFromLines(pageName, json.lines);
    }
  });

  const presentationTrainingWatcher = new PageWatcher({
    fetchPage,
    headPageETag,

    onInit: ({ pageName, json }) => {
      renderPresentationTrainingFromLines(pageName, json.lines);
    },

    onUpdate: ({ pageName, json }) => {
      renderPresentationTrainingFromLines(pageName, json.lines);
    }    
  })

  const researchNoteWatcher = new PageWatcher({
    fetchPage,
    headPageETag,

    onInit: ({ pageName, json }) => {
      loadSettings(currentProjectName, setting => {
        renderCalendar(pageName);
        renderCalendarFromLines(pageName, json);
        renderResearchNoteCreateUI({
          setting,
          pageName,
          rawLines: json.lines
        });
        renderTodoPanel(json.lines);
      });
    },

    onUpdate: ({ pageName, json }) => {
      renderCalendarFromLines(pageName, json);
      renderTodoPanel(json.lines);
    }
  });

  const minutesWatcher = new PageWatcher({
    fetchPage,
    headPageETag,

    onInit: ({ pageName, json }) => {
      //renderMinutesByType(pageName, json);
      renderMinutesFromLines(json.lines);
    },

    onUpdate: ({ pageName, json }) => {
      //renderMinutesByType(pageName, json);
      renderMinutesFromLines(json.lines);
    }
  });

  // const renderMinutesByType = (pageName, json) => {
  //   const lines = json.lines || [];
  //   if (/発表練習/.test(pageName)) {
  //     renderPresentationTrainingFromLines(pageName, lines);
  //   } else {
  //     renderMinutesFromLines(lines);
  //   }
  // };

  /* ================= SPA監視 ================= */
  const classifyPageByName = (pageName) => {
    if (!pageName) return 'project-top';
    if (/研究ノート/.test(pageName)) return 'research-note';
    if (/実験計画書/.test(pageName)) return 'experiment-plan';
    if (/発表練習/.test(pageName)) return 'presentation-training';
    if (/議事録/.test(pageName)) return 'minutes';
    return 'unknown';
  };

  const stopAllWatchers = () => {
    researchNoteWatcher?.stop();
    paperIntroWatcher?.stop();
    minutesWatcher?.stop();
    presentationTrainingWatcher?.stop();
  };

  const route = (projectName, pageName, json) => {
    const lines = normalizeLines(json.lines);
    if (isPaperIntroPage(lines)){
      paperIntroWatcher.start(projectName, pageName);
    } else {
      minutesWatcher.start(projectName, pageName);
    }
  };

  let lastURL = null;

  const tick = async () => {
    if (!isExtensionAlive()) return;

    const url = location.pathname;
    if (url === lastURL) return;
    lastURL = url;

    clearUI();
    stopAllWatchers();
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
        'research-note': () => researchNoteWatcher.start(currentProjectName, pageName),
        'experiment-plan': () => renderExperimentPlan(pageName),
        'paper-intro': () => paperIntroWatcher.start(currentProjectName, pageName),
        'presentation-training': () => presentationTrainingWatcher.start(currentProjectName, pageName),
        'minutes': () => minutesWatcher.start(currentProjectName, pageName),
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
      stopAllWatchers();
    } else {
      lastURL = null;
      tick();
    }
  });

  setInterval(tick, 600);
  tick();
};

start();