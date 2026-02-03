  /* ================= 発表練習パネル =============== */
  const createPresentationTrainingPanel = () => {
    const panelNode = document.createElement('div');
    panelNode.id = MAIN_PANEL_ID;
    applyStyle(panelNode, Styles.panel.base);
    applyPanelSettings(panelNode);
    attachCloseButton(panelNode, MAIN_PANEL_ID);

    const titleNode = document.createElement('div');
    titleNode.id = MAIN_TITLE_ID;
    applyStyle(titleNode, Styles.text.panelTitle);
    panelNode.appendChild(titleNode);

    const bodyNode = document.createElement('div');
    bodyNode.id = MAIN_BODY_ID;
    panelNode.appendChild(bodyNode);

    return panelNode;
  };

  const renderPresentationTrainingFromLines = (pageName, rawLines) => {
    const normalizedLines = normalizeLines(rawLines);
    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, createPresentationTrainingPanel);

    const titleNode = panelNode.querySelector('#' + MAIN_TITLE_ID);
    const bodyNode  = panelNode.querySelector('#' + MAIN_BODY_ID);
    const pageTitle   = normalizedLines[0]?.text || '(untitled)';
    const pageTitleId = normalizedLines[0]?.id;

    titleNode.textContent = '📌 ' + pageTitle;
    if (pageTitleId) titleNode.onclick = () => jumpToLineId(pageTitleId);

    const isTitleLine = (lineText) => /^タイトル[:：]/.test(lineText) || /^タイトル[「『].+[」』]$/.test(lineText);
    const sessions = [];
    let currentSession = null;

    normalizedLines.forEach((line, index) => {
      if (isTitleLine(line.text)) {
        if (currentSession) currentSession.end = index - 1;
        const match = line.text.match(/^タイトル[:：]\s*(.+)$/) || line.text.match(/^タイトル[「『](.+)[」』]$/);
        currentSession = {id: line.id, title: match ? match[1] : line.text, start: index + 1, end: null};
        sessions.push(currentSession);
      }
    });

    if (currentSession) currentSession.end = normalizedLines.length - 1;
    if (sessions.length === 0) sessions.push({id: pageTitleId, title: pageTitle, start: 0, end: normalizedLines.length - 1});

    const seenQuestions = new Set();

    const extractQuestions = (session) => {
      const questions = [];

      for (let i = session.start; i <= session.end; i++) {
        const lineText = normalizedLines[i].text;
        if (!/^\?\s/.test(lineText)) continue;

        const text = lineText.replace(/^\?\s*/, '').trim();
        const key  = text.replace(/\s+/g, ' ');

        if (seenQuestions.has(key)) continue;
        seenQuestions.add(key);

        const author = findAuthorAbove(normalizedLines, i);
        questions.push({ id: normalizedLines[i].id, author, text });
      }

      return questions;
    };

    const fragment = document.createDocumentFragment();

    sessions.forEach(session => {
      const questions = extractQuestions(session);
      if (!questions.length) return;

      appendSectionHeader(fragment, `🎤 ${session.title}`, () => jumpToLineId(session.id));
      questions.forEach(q => {
        appendTextNode(fragment, '・' + (q.author ? `${q.author}: ` : '?: ') + q.text, [Styles.text.item, Styles.list.ellipsis].join(''), () => jumpToLineId(q.id));
      });
    });

    //fragment.appendChild(document.createElement('hr'));
    const statsBlock = createTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);

    bodyNode.replaceChildren(fragment);
  };