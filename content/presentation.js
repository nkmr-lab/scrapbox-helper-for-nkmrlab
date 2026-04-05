/* ================= 発表練習パネル =============== */

const renderPresentationFromLines = (pageName, rawLines) => {
    const lines = normalizeLines(rawLines);
    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    const { bodyNode } = setupPanelHeader(panelNode, rawLines);

    const isPresentationTitleLine = (lineText) =>
        /^タイトル[:：]/.test(lineText) || /^タイトル[「『].+[」』]$/.test(lineText);

    const sessions = [];
    let currentSession = null;

    lines.forEach((line, index) => {
        if (isPresentationTitleLine(line.text)) {
            if (currentSession) currentSession.end = index - 1;
            const match = line.text.match(/^タイトル[:：]\s*(.+)$/) ||
                          line.text.match(/^タイトル[「『](.+)[」』]$/);
            currentSession = { id: line.id, title: match ? match[1] : line.text, start: index + 1, end: null };
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

    const statsBlock = renderTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
