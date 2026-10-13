/* ================= SPA ルーター ================= */

/* URL変更を検知してページ種別に応じた描画を行うルーターを生成する */
const createRouter = (watcherManager) => {
    const clearUI = () => {
        document.getElementById(CALENDAR_PANEL_ID)?.remove();
        document.getElementById(MAIN_PANEL_ID)?.remove();
        document.getElementById(TODO_PANEL_ID)?.remove();
        closeFloatMenu();
        closeDiary();
        document.getElementById(SETTINGS_MODAL_ID)?.remove();
        document.getElementById(PAGE_CREATE_MODAL_ID)?.remove();
        _calendarExpanded = false;
    };

    /* 名前で種別が決まらないページは中身（#論文紹介 の有無）で振り分ける。決めた watcher 種別を返す */
    const routeByContent = async (projectName, pageName, seq) => {
        const json = await fetchPage(projectName, pageName);
        if (!isExtensionAlive() || !json || isStaleNavigation(seq)) return null;

        const lines = normalizeLines(json.lines);
        return isPaperIntroPage(lines) ? 'paperIntro' : 'minutes';
    };

    /* Scrapbox 自体の画面（プロジェクトではない最上位パス） */
    const SYSTEM_TOP_PATHS = new Set(['projects', 'settings', 'api', 'auth', 'login', 'logout', 'new', 'stream']);

    /* pathname を {projectName, pageName} にする。拡張の対象外（Scrapbox の設定・検索画面など）なら null。
       ページ名の / は URL では %2F になるので、素の / で3段以上あるURLはページではない
       （例: /projects/nkmr-lab/settings/basic、/nkmr-lab/search/page） */
    const parseLocation = (pathname) => {
        const m = pathname.match(/^\/([^/]+)(?:\/([^/]*))?\/?$/);
        if (!m || SYSTEM_TOP_PATHS.has(m[1])) return null;
        return { projectName: m[1], pageName: m[2] ? decodeURIComponent(m[2]) : null };
    };

    const watcherTypes = {
        'research-note': 'researchNote',
        'presentation': 'presentation',
        'minutes': 'minutes',
    };

    let lastURL = null;
    /* タブ復帰時に同じページの表示を再開する関数（ページ種別が決まった時点で設定） */
    let resume = null;

    const tick = async () => {
        if (!isExtensionAlive()) return;

        const url = location.pathname;
        if (url === lastURL) return;
        lastURL = url;

        const seq = beginNavigation();
        resume = null;
        cancelPendingHistory();
        clearUI();
        watcherManager.stopAll();
        _closedPanels.clear();
        clearAiCache();
        clearSettingsCache();
        window.__jumpedToTodayInNote = false;

        const loc = parseLocation(url);
        if (!loc) return;

        currentProjectName = loc.projectName;
        const projectName = currentProjectName;
        const pageName = loc.pageName;

        await initTheme(projectName);
        if (isStaleNavigation(seq)) return;
        saveHistory(projectName, pageName);

        if (!pageName) {
            /* トップページではページ配置調整をリセット。
               トップのパネルがメニューと同じ内容（ピン留め・履歴・ボタン）を持つので、フロートメニューは出さない */
            applyPageAlign('center', null, null);
            renderProjectTop();
            return;
        }

        /* フロートメニューは個別ページで表示 */
        openFloatMenu();

        /* 個別ページではユーザー設定のページ配置を適用 */
        const settings = await loadSettings(projectName);
        if (isStaleNavigation(seq)) return;
        applyPageAlign(settings.pageAlign, settings.calendarPosition, settings.floatMenuPosition);

        const type = classifyPageByName(pageName);
        if (type === 'experiment-plan') {
            resume = () => renderExperimentPlan(pageName);
            await renderExperimentPlan(pageName);
            return;
        }

        const watcherType = watcherTypes[type] || await routeByContent(projectName, pageName, seq);
        if (!watcherType || isStaleNavigation(seq)) return;
        resume = () => watcherManager.start(watcherType, projectName, pageName);
        resume();
    };

    const onVisibilityChange = () => {
        if (document.hidden) {
            watcherManager.stopAll();
        } else if (location.pathname !== lastURL) {
            /* 隠れている間にURLが変わっていたら全再描画 */
            lastURL = null;
            tick();
        } else {
            /* 同一ページ復帰 → 監視を再開するだけ（UI再構築しない） */
            resume?.();
        }
    };

    return { tick, onVisibilityChange };
};
