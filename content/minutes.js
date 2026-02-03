/* ==================== 議事録など ====================== */
const createMinutesPanel = () => {
  const panelNode = document.createElement('div');
  applyStyle(panelNode, Styles.panel.base);
  applyPanelSettings(panelNode);

  const title = document.createElement('div');
  title.id = MAIN_TITLE_ID;
  panelNode.appendChild(title);

  const body = document.createElement('div');
  body.id = MAIN_BODY_ID;
  panelNode.appendChild(body);

  return panelNode;
};

const renderMinutesFromLines = async (rawLines) => {
  const enableOpenAI = await isEnableOpenAI();
  const lines = normalizeLines(rawLines, { withUid: true });

  const panelNode = getOrCreatePanel(MAIN_PANEL_ID, createMinutesPanel);
  const body = panelNode.querySelector('#' + MAIN_BODY_ID);

  /* ===== Header ===== */
  const headerNode = panelNode.querySelector('#' + MAIN_TITLE_ID);
  headerNode.textContent = '📌 ' + (rawLines[0]?.text || '');
  applyStyle(headerNode, Styles.text.panelTitle);
  headerNode.onclick = () => jumpToLineId(rawLines[0]?.id);
  attachCloseButton(panelNode, MAIN_PANEL_ID);

  const fragment = document.createDocumentFragment();

  /* =====================================================
    1. session / title 抽出
  ===================================================== */
  const sessions = [];
  let currentSession = null;

  lines.forEach((line, idx) => {
    const text = line.text || '';

    if (isSessionStart(text)) {
      currentSession = {
        id: line.id,
        title: text.replace(/^\[[^\s]+\s*/, '').replace(/\]$/, ''),
        talks: [],
        startIdx: idx,
        endIdx: null
      };
      sessions.push(currentSession);
      return;
    }

    if (isTitleLine(text)) {
      if (!currentSession) {
        currentSession = {
          id: line.id,
          title: 'comments',
          talks: [],
          startIdx: idx,
          endIdx: null
        };
        sessions.push(currentSession);
      }

      currentSession.talks.push({
        id: line.id,
        title: cleanTitle(text),
        idx,
        questions: [],
        impressions: []
      });
    }
  });

  /* ===== session が無いが title はある場合 ===== */
  if (sessions.length === 0) {
    const firstTitleIdx = lines.findIndex(l => isTitleLine(l.text));
    if (firstTitleIdx !== -1) {
      sessions.push({
        id: lines[firstTitleIdx].id,
        title: 'comments',
        talks: [{
          id: lines[firstTitleIdx].id,
          title: cleanTitle(lines[firstTitleIdx].text),
          idx: firstTitleIdx,
          questions: [],
          impressions: []
        }],
        startIdx: 0,
        endIdx: lines.length - 1
      });
    }
  }

  /* ===== endIdx 確定 ===== */
  sessions.forEach((s, i) => {
    s.endIdx =
      i + 1 < sessions.length
        ? sessions[i + 1].startIdx - 1
        : lines.length - 1;
  });

  /* =====================================================
    2. 質問・感想 抽出
  ===================================================== */

  const isBoundaryLine = (text) =>
    isSessionStart(text) ||
    isTitleLine(text) ||
    extractIconName(text) ||
    /^\?\s*/.test(text);

  const collectQuestions = (start, end) => {
    const qs = [];
    const seen = new Set();

    for (let i = start; i <= end; i++) {
      const t = lines[i].text;
      if (!/^\?\s+/.test(t)) continue;

      const q = t.replace(/^\?\s+/, '').trim();
      const key = q.replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      qs.push({
        id: lines[i].id,
        text: q,
        author: findAuthorAbove(lines, i)
      });
    }
    return qs;
  };

  // ★ 複数行対応の感想収集 ★
  const collectImpressions = (start, end) => {
    const ims = [];

    for (let i = start; i <= end; i++) {
      const author = extractIconName(lines[i]?.text);
      if (!author) continue;

      const texts = [];
      let j = i + 1;

      while (j <= end && lines[j]?.text && !isBoundaryLine(lines[j].text)) {
        texts.push(lines[j].text.trim());
        j++;
      }

      if (texts.length) {
        ims.push({
          author,
          text: texts.join(' ')
        });
      }

      i = j - 1;
    }

    return ims;
  };

  /* ===== 各 session / talk に割り当て ===== */
  sessions.forEach(session => {
    session.talks.forEach((talk, i) => {
      const start = talk.idx + 1;
      const end =
        i + 1 < session.talks.length
          ? session.talks[i + 1].idx - 1
          : session.endIdx;

      talk.questions   = collectQuestions(start, end);
      talk.impressions = collectImpressions(start, end);
    });

    // ★ title が無い session → 仮想 talk を作る
    if (session.talks.length === 0) {
      const ims = collectImpressions(session.startIdx, session.endIdx);
      const qs  = collectQuestions(session.startIdx, session.endIdx);

      if (ims.length || qs.length) {
        session.talks.push({
          id: session.id,
          title: 'comments',
          idx: session.startIdx,
          questions: qs,
          impressions: ims
        });
      }
    }
  });

  /* =====================================================
    3. 描画
  ===================================================== */
  sessions.forEach(session => {
    appendSectionHeader(
      fragment,
      session.title,
      () => jumpToLineId(session.id)
    );

    session.talks.forEach(talk => {
      const titleNode = appendTextNode(
        fragment,
        '└ ' + talk.title,
        [Styles.text.item, Styles.list.ellipsis, Styles.text.subTitle].join(''),
        () => jumpToLineId(talk.id)
      );

      // ===== AI 要約 =====
      if (enableOpenAI && talk.impressions.length >= 2) {
        const btn = document.createElement('span');
        btn.textContent = ' 🧠';
        btn.style = 'cursor:pointer;color:#888;margin-left:4px';

        btn.onclick = async () => {
          btn.textContent = ' ⏳';
          const summary = await summarizeImpressionsByAuthor(talk.impressions);
          btn.textContent = ' 🧠';
          if (!summary) return;

          const box = document.createElement('div');
          box.style = `
            margin:4px 0 6px 1.5em;
            padding:4px 6px;
            background:#f7f7f7;
            font-size:11px;
            border-left:3px solid #ccc;
            white-space:pre-line;
          `;
          box.textContent = '🧠 AI要約\n' + summary;
          titleNode.after(box);
        };

        titleNode.appendChild(btn);
      }

      talk.questions.forEach(q => {
        appendTextNode(
          fragment,
          '　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
          [Styles.text.item, Styles.list.ellipsis, 'color: #555;'].join(''),
          () => jumpToLineId(q.id)
        );
      });
    });
  });

  const statsBlock = createTalkStatsBlock(rawLines);
  if (statsBlock) fragment.appendChild(statsBlock);

  body.replaceChildren(fragment);
};

const createTalkStatsBlock = (rawLines) => {
  const { stats, idToName } = buildTalkStats(rawLines);
  if (!Object.keys(stats).length) return null;

  const box = document.createElement('div');
  renderTalkStats(box, stats, idToName);
  return box;
};
