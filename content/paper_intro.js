/* ================= 論文紹介パネル =============== */

const renderPaperPanelFromLines = (pageName, rawLines) => {
    const lines = normalizeLines(rawLines);
    if (!isPaperIntroPage(lines)) return;

    let inQnA = false;
    const questionMap = new Map();
    const normalize = (s) => s.replace(/\s+/g, ' ').trim();

    lines.forEach((line, idx) => {
        const t = line.text;

        if (t === '[*** 質問・コメント]') { inQnA = true; return; }
        if (inQnA && /^\[\*{3}\s/.test(t)) { inQnA = false; return; }

        if (inQnA && /^\?\s/.test(t)) {
            const text = normalize(t.replace(/^\?\s*/, ''));
            const author = findAuthorAbove(lines, idx);
            const existing = questionMap.get(text);
            if (!existing || (!existing.author && author)) {
                questionMap.set(text, { id: line.id, text, author });
            }
        }
    });

    const questions = Array.from(questionMap.values());

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, createStandardPanel);
    setupPanelHeader(panelNode, rawLines, '📄');
    const bodyNode = panelNode.querySelector('#' + MAIN_BODY_ID);

    const fragment = document.createDocumentFragment();
    appendQuestionList(fragment, questions);

    const statsBlock = createTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
