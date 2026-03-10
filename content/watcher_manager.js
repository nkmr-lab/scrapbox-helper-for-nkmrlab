class WatcherManager {
  constructor() {
    this.currentProjectName = null;

    this.paperIntroWatcher = new PageWatcher({
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

    this.presentationTrainingWatcher = new PageWatcher({
      fetchPage,
      headPageETag,

      onInit: ({ pageName, json }) => {
        renderPresentationTrainingFromLines(pageName, json.lines);
      },

      onUpdate: ({ pageName, json }) => {
        renderPresentationTrainingFromLines(pageName, json.lines);
      }
    });

    this.researchNoteWatcher = new PageWatcher({
      fetchPage,
      headPageETag,

      onInit: ({ pageName, json }) => {
        loadSettings(this.currentProjectName, settings => {
          renderCalendar(pageName);
          renderCalendarFromLines(pageName, json);
          renderResearchNoteCreateUI({
            userName: settings.userName,
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

    this.minutesWatcher = new PageWatcher({
      fetchPage,
      headPageETag,

      onInit: ({ pageName, json }) => {
        renderMinutesFromLines(json.lines);
      },

      onUpdate: ({ pageName, json }) => {
        renderMinutesFromLines(json.lines);
      }
    });
  }

  setProjectName(projectName) {
    this.currentProjectName = projectName;
  }

  stopAllWatchers() {
    this.researchNoteWatcher?.stop();
    this.paperIntroWatcher?.stop();
    this.minutesWatcher?.stop();
    this.presentationTrainingWatcher?.stop();
  }

  startResearchNoteWatcher(projectName, pageName) {
    this.currentProjectName = projectName;
    this.researchNoteWatcher.start(projectName, pageName);
  }

  startPaperIntroWatcher(projectName, pageName) {
    this.currentProjectName = projectName;
    this.paperIntroWatcher.start(projectName, pageName);
  }

  startMinutesWatcher(projectName, pageName) {
    this.currentProjectName = projectName;
    this.minutesWatcher.start(projectName, pageName);
  }

  startPresentationTrainingWatcher(projectName, pageName) {
    this.currentProjectName = projectName;
    this.presentationTrainingWatcher.start(projectName, pageName);
  }

  route(projectName, pageName, json) {
    this.currentProjectName = projectName;
    const lines = normalizeLines(json.lines);

    if (isPaperIntroPage(lines)) {
      this.paperIntroWatcher.start(projectName, pageName);
    } else {
      this.minutesWatcher.start(projectName, pageName);
    }
  }
}

window.WatcherManager = WatcherManager;