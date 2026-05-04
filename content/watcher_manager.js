/* ================= Watcher 管理 ================= */

/* ページ種別ごとのPageWatcherインスタンスを一括管理する */
class WatcherManager {
    constructor() {
        this.projectName = null;

        /* projectUsers をロードして render 関数を呼ぶハンドラを生成する。
           guard を指定するとそれが falsy を返す場合は描画をスキップする。 */
        const renderWithUsers = (renderFn, guard = null) => async ({ pageName, json }) => {
            if (guard && !guard(json.lines)) return;
            const projectUsers = await loadProjectUsers(this.projectName);
            await renderFn(pageName, json.lines, projectUsers);
        };

        const sharedWatcher = (renderFn, guard = null) => new PageWatcher({
            fetchPage, headPageETag,
            onInit: renderWithUsers(renderFn, guard),
            onUpdate: renderWithUsers(renderFn, guard),
        });

        this.watchers = {
            paperIntro: sharedWatcher(renderPaperIntroFromLines, isPaperIntroPage),
            presentation: sharedWatcher(renderPresentationFromLines),
            minutes: sharedWatcher(renderMinutesFromLines),

            researchNote: new PageWatcher({
                fetchPage, headPageETag,
                onInit: async ({ pageName, json }) => {
                    const settings = await loadSettings(this.projectName);
                    renderCalendar(pageName);
                    renderCalendarFromLines(pageName, json);
                    renderResearchNoteCreateUI({
                        userName: settings.userName,
                        pageName,
                        rawLines: json.lines,
                    });
                    await renderTodoPanel(json.lines);
                },
                onUpdate: async ({ pageName, json }) => {
                    renderCalendarFromLines(pageName, json);
                    await renderTodoPanel(json.lines);
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
