/* ================= Watcher 管理 ================= */

/* ページ種別ごとのPageWatcherインスタンスを一括管理する */
class WatcherManager {
    constructor() {
        this.projectName = null;

        this.watchers = {
            paperIntro: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: ({ pageName, json }) => {
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines, json.collaborators);
                },
                onUpdate: ({ pageName, json }) => {
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines, json.collaborators);
                }
            }),

            presentation: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: ({ pageName, json }) => {
                    renderPresentationFromLines(pageName, json.lines, json.collaborators);
                },
                onUpdate: ({ pageName, json }) => {
                    renderPresentationFromLines(pageName, json.lines, json.collaborators);
                },
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
                onInit: async ({ pageName, json }) => {
                    await renderMinutesFromLines(json.lines, json.collaborators);
                },
                onUpdate: async ({ pageName, json }) => {
                    await renderMinutesFromLines(json.lines, json.collaborators);
                },
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
