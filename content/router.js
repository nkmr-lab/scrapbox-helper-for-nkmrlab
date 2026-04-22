/* ================= SPA ルーター ================= */

/* URL変更を検知してページ種別に応じた描画を行うルーターを生成する */
const createRouter = (watcherManager) => {
    const clearUI = () => {
        document.getElementById(CALENDAR_PANEL_ID)?.remove();
        document.getElementById(MAIN_PANEL_ID)?.remove();
        document.getElementById(TODO_PANEL_ID)?.remove();
        closeFloatMenu();
        document.getElementById(SETTINGS_MODAL_ID)?.remove();
        document.getElementById(PAGE_CREATE_MODAL_ID)?.remove();
        calendarExpanded = false;
    };

    const routeByContent = async (projectName, pageName) => {
        const json = await fetchPage(projectName, pageName);
        if (!isExtensionAlive() || !json) return;

        const lines = normalizeLines(json.lines);
        if (isPaperIntroPage(lines)) {
            watcherManager.start('paperIntro', projectName, pageName);
        } else {
            watcherManager.start('minutes', projectName, pageName);
        }
    };

    const handlers = {
        'research-note': (pj, pg) => watcherManager.start('researchNote', pj, pg),
        'experiment-plan': async (_pj, pg) => await renderExperimentPlan(pg),
        'presentation': (pj, pg) => watcherManager.start('presentation', pj, pg),
        'minutes': (pj, pg) => watcherManager.start('minutes', pj, pg),
    };

    let lastURL = null;

    const tick = async () => {
        if (!isExtensionAlive()) return;

        const url = location.pathname;
        if (url === lastURL) return;
        lastURL = url;

        clearUI();
        watcherManager.stopAll();
        closedPanels.clear();
        clearAiCache();
        clearSettingsCache();
        resetPageVotes();
        window.__jumpedToTodayInNote = false;

        const match = url.match(/^\/([^/]+)(?:\/(.*))?$/);
        if (!match) return;

        currentProjectName = match[1];
        const pageName = match[2] ? decodeURIComponent(match[2]) : null;

        await initTheme(currentProjectName);
        await loadUserNameCache(currentProjectName);
        saveHistory(currentProjectName, pageName);

        /* フロートメニューは全ページで表示 */
        openFloatMenu();

        if (!pageName) {
            /* トップページではページ配置調整をリセット */
            applyPageAlign('center', null);
            if (!isExtensionAlive()) return;
            renderProjectTop();
            return;
        }

        /* 個別ページではユーザー設定のページ配置を適用 */
        const settings = await loadSettings(currentProjectName);
        applyPageAlign(settings.pageAlign, settings.calendarPosition);

        const type = classifyPageByName(pageName);
        const handler = handlers[type];
        if (handler) {
            await handler(currentProjectName, pageName);
        } else {
            await routeByContent(currentProjectName, pageName);
        }
    };

    const onVisibilityChange = () => {
        if (document.hidden) {
            watcherManager.stopAll();
        } else {
            /* URL変更があった場合のみ全再描画、なければWatcher再起動のみ */
            if (location.pathname !== lastURL) {
                lastURL = null;
                tick();
            } else {
                /* 同一ページ復帰 → Watcherを再開するだけ（UI再構築しない） */
                const match = location.pathname.match(/^\/([^/]+)(?:\/(.*))?$/);
                if (!match) return;
                const pageName = match[2] ? decodeURIComponent(match[2]) : null;
                if (pageName) {
                    const type = classifyPageByName(pageName);
                    const handler = handlers[type];
                    if (handler) {
                        handler(currentProjectName, pageName);
                    }
                }
            }
        }
    };

    return { tick, onVisibilityChange };
};
