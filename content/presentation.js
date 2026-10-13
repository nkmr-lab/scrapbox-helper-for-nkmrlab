/* ================= 発表練習パネル =============== */

/* 発表練習ページの質問一覧と統計をパネルに描画する */
const renderPresentationFromLines = (pageName, rawLines, projectUsers) => {
    const lines = normalizeLines(rawLines, { withUid: true });

    /* 当該ページの名前解決マップを用意する */
    applyProjectUsers(projectUsers, lines);

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    if (!panelNode) return;  /* ✕で閉じられている */
    const { bodyNode } = renderPanelHeader(panelNode, rawLines);

    /* 発表の区切り行からタイトルを返す（区切りでなければnull）。
       旧形式 `タイトル: xxx` `タイトル「xxx」` と、ページ生成テンプレートの `[(* xxx]`（( 付き見出し）を受ける。
       `[** 質問]` `[** コメント]` は発表内の小見出しなので区切りにしない */
    const presentationTitleOf = (lineText) => {
        const m = lineText.match(/^タイトル[:：]\s*(.+)$/) || lineText.match(/^タイトル[「『](.+)[」』]$/);
        if (m) return m[1];
        const h = parseHeadingLine(lineText);
        if (h && h.decorators.includes('(')) return h.title;
        return null;
    };

    const sessions = [];
    let currentSession = null;

    lines.forEach((line, index) => {
        const title = presentationTitleOf(line.text);
        if (title) {
            if (currentSession) currentSession.end = index - 1;
            currentSession = { id: line.id, title, start: index + 1, end: null };
            sessions.push(currentSession);
        }
    });

    if (currentSession) currentSession.end = lines.length - 1;
    if (sessions.length === 0) {
        const pageTitle = lines[0]?.text || '(untitled)';
        sessions.push({ id: lines[0]?.id, title: pageTitle, start: 0, end: lines.length - 1 });
    }

    const seenQuestions = new Set();
    const fragment = document.createDocumentFragment();

    sessions.forEach(session => {
        const questions = collectQuestions(lines, session.start, session.end, { seen: seenQuestions });
        if (!questions.length) return;

        appendSectionHeader(fragment, `🎤 ${session.title}`, () => jumpToLineId(session.id));
        appendQuestionList(fragment, questions);
    });

    appendStatsBlock(fragment, lines);
    bodyNode.replaceChildren(fragment);
};
