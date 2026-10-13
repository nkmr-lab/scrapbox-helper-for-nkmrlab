/* ================== PageWatcher Class =================== */
  /* ページの変更をETagベースでポーリング監視する */
  class PageWatcher {
    constructor({
      interval = WATCHER_INTERVAL,
      fetchPage,
      headPageETag,
      onInit,
      onUpdate
    }) {
      this.interval = interval;
      this.fetchPage = fetchPage;
      this.headPageETag = headPageETag;
      this.onInit = onInit;
      this.onUpdate = onUpdate;

      this.timer = null;
      this.lastETag = null;
      this.warmedUp = false;
      this.inflight = false;
      /* start/stop のたびに増える世代番号。通信待ちの間に止められた古い実行は、戻ってきても何もしない */
      this.gen = 0;
    }

    async _run(projectName, pageName) {
      if (this.inflight) return;
      this.inflight = true;
      const gen = this.gen;
      const stale = () => gen !== this.gen;
      /* 描画側にも渡す（描画の途中に await があっても、止められていたら描かない） */
      const isActive = () => !stale();

      try {
        /* ========= 初回：必ず GET ========= */
        if (!this.warmedUp) {
          const json = await this.fetchPage(projectName, pageName);
          if (stale() || !json) return;

          const etag = await this.headPageETag(projectName, pageName);
          if (stale()) return;
          this.lastETag = etag;
          this.warmedUp = true;

          await this.onInit?.({ projectName, pageName, json, isActive });
          return;
        }

        /* ========= 通常：HEAD ========= */
        const etag = await this.headPageETag(projectName, pageName);
        if (stale()) return;

        // 変更なし
        if (etag && etag === this.lastETag) return;

        // 変更あり（または HEAD 失敗時は安全側で GET）
        const json = await this.fetchPage(projectName, pageName);
        if (stale() || !json) return;
        if (etag) this.lastETag = etag;

        await this.onUpdate?.({ projectName, pageName, json, isActive });
      } catch (e) {
        console.warn('[SB Helper] PageWatcher:', e);
      } finally {
        if (!stale()) this.inflight = false;
      }
    }

    start(projectName, pageName) {
      this.stop();
      const tick = () => this._run(projectName, pageName);
      tick();
      this.timer = setInterval(tick, this.interval);
    }

    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.lastETag = null;
      this.warmedUp = false;
      this.inflight = false;
      this.gen++;
    }
  }
