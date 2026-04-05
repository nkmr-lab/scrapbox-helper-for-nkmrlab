/* ================= SPA ルーター ================= */

const createRouter = (watcherManager) => {
    const clearUI = () => {
        document.getElementById(CALENDAR_ID)?.remove();
        document.getElementById(MAIN_PANEL_ID)?.remove();
        document.getElementById(TODO_PANEL_ID)?.remove();
        removeFloatMenu();
        document.getElementById(SETTINGS_MODAL_ID)?.remove();
        document.getElementById(PAGE_CREATE_MODAL_ID)?.remove();
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
        _settingsCache = null;

        const match = url.match(/^\/([^/]+)(?:\/(.*))?$/);
        if (!match) return;

        currentProjectName = match[1];
        const pageName = match[2] ? decodeURIComponent(match[2]) : null;

        await initTheme(currentProjectName);
        await loadUserNameCache(currentProjectName);
        saveHistory(currentProjectName, pageName);

        /* フロートメニューは全ページで表示 */
        renderFloatMenu();

        if (!pageName) {
            if (!isExtensionAlive()) return;
            renderProjectTop();
            return;
        }

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
            lastURL = null;
            tick();
        }
    };

    return { tick, onVisibilityChange };
};
