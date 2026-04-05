/* ================= エントリポイント ================= */

/* 拡張機能を初期化してルーティングを開始する */
const start = () => {
    if (window.__SB_EXTENSION_RUNNING__) return;
    window.__SB_EXTENSION_RUNNING__ = true;

    const watcherManager = new WatcherManager();
    const router = createRouter(watcherManager);

    document.addEventListener('visibilitychange', router.onVisibilityChange);
    setInterval(router.tick, TICK_INTERVAL);
    router.tick();
};

start();
