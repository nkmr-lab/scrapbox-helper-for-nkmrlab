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
                    applyCollaborators(this.projectName, json.collaborators);
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines);
                },
                onUpdate: ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines);
                }
            }),

            presentation: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
                    renderPresentationFromLines(pageName, json.lines);
                },
                onUpdate: ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
                    renderPresentationFromLines(pageName, json.lines);
                },
            }),

            researchNote: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
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
                    applyCollaborators(this.projectName, json.collaborators);
                    renderCalendarFromLines(pageName, json);
                    await renderTodoPanel(json.lines);
                }
            }),

            minutes: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
                    await renderMinutesFromLines(json.lines);
                },
                onUpdate: async ({ pageName, json }) => {
                    applyCollaborators(this.projectName, json.collaborators);
                    await renderMinutesFromLines(json.lines);
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
