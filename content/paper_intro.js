/* ================= 論文紹介パネル =============== */
/* 論文紹介ページの質問抽出と統計表示 */

/* 論文紹介ページの質問一覧と統計をパネルに描画する */
const renderPaperIntroFromLines = (pageName, rawLines, projectUsers) => {
    const lines = normalizeLines(rawLines, { withUid: true });
    if (!isPaperIntroPage(lines)) return;

    /* 当該ページの名前解決マップを用意する */
    applyProjectUsers(projectUsers, lines);

    let inQnA = false;
    const questionMap = new Map();
    const normalize = (s) => s.replace(/\s+/g, ' ').trim();

    lines.forEach((line, idx) => {
        const t = line.text;

        if (t === '[*** 質問・コメント]') { inQnA = true; return; }
        if (inQnA && /^\[\*{3}\s/.test(t)) { inQnA = false; return; }

        if (inQnA && /^\?\s/.test(t)) {
            const text = normalize(t.replace(/^\?\s*/, ''));
            let author = findAuthorAbove(lines, idx);
            if (!author && line.uid && line.uid !== 'unknown') {
                author = resolveUserName(line.uid);
            }
            const existing = questionMap.get(text);
            if (!existing || (!existing.author && author)) {
                questionMap.set(text, { id: line.id, text, author });
            }
        }
    });

    const questions = Array.from(questionMap.values());

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    renderPanelHeader(panelNode, rawLines, '📄');
    const bodyNode = panelNode.querySelector('#' + MAIN_BODY_ID);

    const fragment = document.createDocumentFragment();
    appendQuestionList(fragment, questions);

    appendStatsBlock(fragment, lines);
    bodyNode.replaceChildren(fragment);
};
