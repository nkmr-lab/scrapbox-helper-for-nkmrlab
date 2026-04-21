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
    }

    async _run(projectName, pageName) {
      if (this.inflight) return;
      this.inflight = true;

      try {
        /* ========= 初回：必ず GET ========= */
        if (!this.warmedUp) {
          const json = await this.fetchPage(projectName, pageName);
          if (!json) return;

          this.lastETag = await this.headPageETag(projectName, pageName);
          this.warmedUp = true;

          this.onInit?.({ projectName, pageName, json });
          return;
        }

        /* ========= 通常：HEAD ========= */
        const etag = await this.headPageETag(projectName, pageName);

        // HEAD 失敗時は安全に GET
        if (!etag) {
          const json = await this.fetchPage(projectName, pageName);
          if (!json) return;
          this.onUpdate?.({ projectName, pageName, json });
          return;
        }

        // 変更なし
        if (etag === this.lastETag) return;

        this.lastETag = etag;
        const json = await this.fetchPage(projectName, pageName);
        if (!json) return;

        this.onUpdate?.({ projectName, pageName, json });
      } finally {
        this.inflight = false;
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
    }
  }
