/* ================= Watcher 管理 ================= */

class WatcherManager {
    constructor() {
        this.projectName = null;

        this.watchers = {
            paperIntro: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: ({ pageName, json }) => {
                    if (isPaperIntroPage(json.lines)) renderPaperPanelFromLines(pageName, json.lines);
                },
                onUpdate: ({ pageName, json }) => {
                    if (isPaperIntroPage(json.lines)) renderPaperPanelFromLines(pageName, json.lines);
                }
            }),

            presentation: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: ({ pageName, json }) => renderPresentationFromLines(pageName, json.lines),
                onUpdate: ({ pageName, json }) => renderPresentationFromLines(pageName, json.lines),
            }),

            researchNote: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => {
                    const settings = await loadSettings(this.projectName);
                    renderCalendar(pageName);
                    renderCalendarFromLines(pageName, json);
                    renderResearchNoteCreateUI({
                        userName: settings.userName,
                        pageName,
                        rawLines: json.lines
                    });
                    await renderTodoPanel(json.lines);
                },
                onUpdate: async ({ pageName, json }) => {
                    renderCalendarFromLines(pageName, json);
                    await renderTodoPanel(json.lines);
                }
            }),

            minutes: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => await renderMinutesFromLines(json.lines),
                onUpdate: async ({ pageName, json }) => await renderMinutesFromLines(json.lines),
            }),
        };
    }

    stopAll() {
        Object.values(this.watchers).forEach(w => w.stop());
    }

    start(type, projectName, pageName) {
        this.projectName = projectName;
        this.watchers[type]?.start(projectName, pageName);
    }
}
