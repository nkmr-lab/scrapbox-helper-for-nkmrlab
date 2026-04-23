/* ================= Watcher 管理 ================= */

/* ページ種別ごとのPageWatcherインスタンスを一括管理する */
class WatcherManager {
    constructor() {
        this.projectName = null;

        this.watchers = {
            paperIntro: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => {
                    const projectUsers = await loadProjectUsers(this.projectName);
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines, projectUsers);
                },
                onUpdate: async ({ pageName, json }) => {
                    const projectUsers = await loadProjectUsers(this.projectName);
                    if (isPaperIntroPage(json.lines)) renderPaperIntroFromLines(pageName, json.lines, projectUsers);
                }
            }),

            presentation: new PageWatcher({
                fetchPage,
                headPageETag,
                onInit: async ({ pageName, json }) => {
                    const projectUsers = await loadProjectUsers(this.projectName);
                    renderPresentationFromLines(pageName, json.lines, projectUsers);
                },
                onUpdate: async ({ pageName, json }) => {
                    const projectUsers = await loadProjectUsers(this.projectName);
                    renderPresentationFromLines(pageName, json.lines, projectUsers);
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
                    const projectUsers = await loadProjectUsers(this.projectName);
                    await renderMinutesFromLines(json.lines, projectUsers);
                },
                onUpdate: async ({ pageName, json }) => {
                    const projectUsers = await loadProjectUsers(this.projectName);
                    await renderMinutesFromLines(json.lines, projectUsers);
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
