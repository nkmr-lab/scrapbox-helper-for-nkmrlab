/* ================= 論文紹介 =============== */

/* --- ページ生成テンプレート --- */
/* 論文紹介ページのテンプレート本文を生成する */
const generatePaperIntroBody = (title, userName) => {
    const today = formatYmd(new Date());
    const year = new Date().getFullYear();

    return [
        '',
        '日付',
        `#${today}`,
        '',
        '発表者',
        userName ? `#${userName}` : '# 発表者名',
        '',
        '指定質問者',
        '# 指定質問者名',
        '',
        '著者',
        '[論文著者名] （共著含む。所属も）',
        '',
        'URL',
        '[論文のpdf]',
        '[slide]',
        '',
        '論文が投稿された学会',
        '',
        '',
        '論文の種類',
        '  #論文誌 , #学会誌',
        '',
        '[/icons/hr.icon]',
        '書記',
        '',
        '',
        '[(** 概要]',
        '[* 背景]',
        '',
        '[* 目的]',
        '',
        '[* 関連研究]',
        '',
        '[* 提案手法]',
        '',
        '[* 実験]',
        '',
        '[* 結果]',
        '',
        '[* 考察]',
        '',
        '[* まとめ]',
        '',
        '[(** 質問・コメント]',
        '',
        '',
        `#論文紹介関連 `,
        `#論文紹介${year}`,
    ].join('\n');
};

/* --- パネル描画 --- */

/* 論文紹介ページの質問一覧と統計をパネルに描画する */
const renderPaperIntroFromLines = (pageName, rawLines) => {
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

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    setupPanelHeader(panelNode, rawLines, '📄');
    const bodyNode = panelNode.querySelector('#' + MAIN_BODY_ID);

    const fragment = document.createDocumentFragment();
    appendQuestionList(fragment, questions);

    const statsBlock = renderTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
