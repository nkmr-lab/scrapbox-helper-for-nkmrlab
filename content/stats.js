  /* ================= 統計処理用 ==================== */
  let userNameCache = {};
  let userNameCacheLoaded = false;

  const loadUserNameCache = (projectName) => {
    if (userNameCacheLoaded) return Promise.resolve(userNameCache);

    return new Promise(resolve => {
      chrome.storage.local.get(
        { [`sb:${projectName}:userMap`]: {} },
        data => {
          userNameCache = data[`sb:${projectName}:userMap`] || {};
          userNameCacheLoaded = true;
          resolve(userNameCache);
        }
      );
    });
  };

  const saveUserNameToCache = (projectName, uid, name) => {
    if (!uid || !name) return;
    if (userNameCache[uid] === name) return;

    userNameCache[uid] = name;

    chrome.storage.local.set({
      [`sb:${projectName}:userMap`]: userNameCache
    });
  };

  const buildTalkStats = (rawLines) => {
    const stats = {};
    const idToName = { ...userNameCache };
    const lines = normalizeLines(rawLines, { withUid: true });

    lines.forEach(line => {
      const { text, uid } = line;
      if (!uid || uid === 'unknown') return;

      const name = extractIconName(text);
      if (name) {
        idToName[uid] = name;
        saveUserNameToCache(currentProjectName, uid, name);
      }

      if (text && !text.startsWith('[')) {
        stats[uid] = (stats[uid] || 0) + text.length;
      }
    });

    return { stats, idToName };
  };

  const renderTalkStats = (parentNode, stats, idToName) => {
    const entries = Object.entries(stats);
    if (!entries.length) return;

    appendSectionHeader(parentNode, '📊 発言数');

    const max = Math.max(...entries.map(([, v]) => v), 1);

    entries
      .sort((a, b) => b[1] - a[1])
      .forEach(([uid, count]) => {
        const name = idToName[uid] || uid;

        const row = document.createElement('div');
        row.style =
          'display:flex;' +
          'align-items:center;' +
          'margin:4px 0;' +
          'overflow:hidden';

        const label = document.createElement('div');
        label.textContent = name;
        label.style =
          'width:5em;' +
          'font-size:11px;' +
          'white-space:nowrap;' +
          'overflow:hidden;' +
          'text-overflow:ellipsis';

        const right = document.createElement('div');
        right.style =
          'flex:1;' +
          'display:flex;' +
          'align-items:center;' +
          'gap:6px;' +
          'overflow:hidden';

        const barWrap = document.createElement('div');
        barWrap.style =
          'flex:1;' +
          'background:#fff;' +
          'height:6px;' +
          'overflow:hidden';

        const bar = document.createElement('div');
        bar.style =
          'background:#4caf50;' +
          'height:100%;' +
          `width:${(count / max) * 100}%`;

        barWrap.appendChild(bar);

        const value = document.createElement('div');
        value.textContent = count;
        value.style =
          'font-size:11px;' +
          'min-width:2em;' +
          'text-align:right;' +
          'flex-shrink:0';

        right.append(barWrap, value);
        row.append(label, right);
        parentNode.appendChild(row);
      });
  };