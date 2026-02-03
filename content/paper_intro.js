  /* ================= 論文紹介パネル =============== */
  const createPaperIntroPanel = () => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base);
    applyPanelSettings(panelNode);
    attachCloseButton(panelNode, MAIN_PANEL_ID);

    const title = document.createElement('div');
    title.id = MAIN_TITLE_ID;
    panelNode.appendChild(title);

    const body = document.createElement('div');
    body.id = MAIN_BODY_ID;
    panelNode.appendChild(body);

    return panelNode;
  };

  const renderPaperPanelFromLines = (pageName, rawLines) => {
    const lines = normalizeLines(rawLines);

    if (!isPaperIntroPage(lines)) return;

    let title = null;
    let titleId = null;

    lines.forEach(line => {
      if (!title && line.text) {
        title = line.text;
        titleId = line.id;
      }
      if (line.text === '[*** 概要]') abstractId = line.id;
      if (line.text === '[*** 質問・コメント]') qnaId = line.id;
    });

    let inQnA = false;
    const questionMap = new Map(); // key -> { id, text, author }

    const normalize = (s) => s.replace(/\s+/g, ' ').trim();

    lines.forEach((line, idx) => {
      const t = line.text;

      if (t === '[*** 質問・コメント]') {
        inQnA = true;
        return;
      }

      if (inQnA && /^\[\*{3}\s/.test(t)) {
        inQnA = false;
        return;
      }

      if (inQnA && /^\?\s/.test(t)) {
        const text = normalize(t.replace(/^\?\s*/, ''));
        const author = findAuthorAbove(lines, idx);
        const existing = questionMap.get(text);

        // 重複時：質問者が特定できる方を優先
        if (!existing || (!existing.author && author)) {
          questionMap.set(text, { id: line.id, text, author });
        }
      }
    });

    const questions = Array.from(questionMap.values());

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, createPaperIntroPanel);
    const body = panelNode.querySelector('#' + MAIN_BODY_ID);

    const headerNode = panelNode.querySelector('#' + MAIN_TITLE_ID);
    headerNode.textContent = '📄 ' + title;
    applyStyle(headerNode, Styles.text.panelTitle);
    if (titleId) headerNode.onclick = () => jumpToLineId(titleId);

    const fragment = document.createDocumentFragment();
    if (questions.length) {
      questions.forEach(q => {
        appendTextNode(fragment, '・' + (q.author ? `${q.author}: ` : '?: ') + q.text, [Styles.text.item, Styles.list.ellipsis].join(''), () => jumpToLineId(q.id));
      });
    }

    //fragment.appendChild(document.createElement('hr'));
    const statsBlock = createTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);

    body.replaceChildren(fragment);
  };
