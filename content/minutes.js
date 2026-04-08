/* ==================== 議事録 ====================== */

/* セッションとトークの構造をテキスト行から抽出する */
const parseSessions = (lines) => {
    const sessions = [];
    let currentSession = null;

    lines.forEach((line, idx) => {
        const text = line.text || '';

        if (isSessionStart(text)) {
            currentSession = {
                id: line.id,
                title: text.replace(/^\[[^\s]+\s*/, '').replace(/\]$/, ''),
                talks: [], startIdx: idx, endIdx: null
            };
            sessions.push(currentSession);
            return;
        }

        if (isTitleLine(text)) {
            if (!currentSession) {
                currentSession = { id: line.id, title: 'comments', talks: [], startIdx: idx, endIdx: null };
                sessions.push(currentSession);
            }
            currentSession.talks.push({
                id: line.id, title: cleanTitle(text), idx, questions: [], impressions: []
            });
        }
    });

    if (sessions.length === 0) {
        const firstTitleIdx = lines.findIndex(l => isTitleLine(l.text));
        if (firstTitleIdx !== -1) {
            sessions.push({
                id: lines[firstTitleIdx].id, title: 'comments',
                talks: [{ id: lines[firstTitleIdx].id, title: cleanTitle(lines[firstTitleIdx].text),
                    idx: firstTitleIdx, questions: [], impressions: [] }],
                startIdx: 0, endIdx: lines.length - 1
            });
        }
    }

    sessions.forEach((s, i) => {
        s.endIdx = i + 1 < sessions.length ? sessions[i + 1].startIdx - 1 : lines.length - 1;
    });

    return sessions;
};

/* 指定範囲の行からアイコン付き感想を収集する */
const collectImpressions = (lines, start, end) => {
    const isBoundaryLine = (text) =>
        isSessionStart(text) || isTitleLine(text) || extractIconName(text) || /^\?\s*/.test(text);

    const ims = [];
    for (let i = start; i <= end; i++) {
        const author = extractIconName(lines[i]?.text);
        if (!author) continue;
        const texts = [];
        let j = i + 1;
        while (j <= end && lines[j]?.text && !isBoundaryLine(lines[j].text)) {
            texts.push(lines[j].text.trim()); j++;
        }
        if (texts.length) ims.push({ author, text: texts.join(' ') });
        i = j - 1;
    }
    return ims;
};

/* 各トークに質問と感想を割り当てる */
const populateSessionData = (sessions, lines) => {
    sessions.forEach(session => {
        session.talks.forEach((talk, i) => {
            const start = talk.idx + 1;
            const end = i + 1 < session.talks.length ? session.talks[i + 1].idx - 1 : session.endIdx;
            talk.questions = collectQuestions(lines, start, end);
            talk.impressions = collectImpressions(lines, start, end);
        });

        if (session.talks.length === 0) {
            const ims = collectImpressions(lines, session.startIdx, session.endIdx);
            const qs = collectQuestions(lines, session.startIdx, session.endIdx);
            if (ims.length || qs.length) {
                session.talks.push({
                    id: session.id, title: 'comments', idx: session.startIdx,
                    questions: qs, impressions: ims
                });
            }
        }
    });
};

/* 議事録の行データをパースしてパネルに描画する */
const renderMinutesFromLines = async (rawLines) => {
    const enableOpenAI = await isOpenAIEnabled();
    const lines = normalizeLines(rawLines, { withUid: true });

    /* 著者推定のため、描画前に統計を計算しておく（_lastTalkStatsに格納される） */
    buildTalkStats(rawLines);

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    const { bodyNode } = setupPanelHeader(panelNode, rawLines);
    const fragment = document.createDocumentFragment();

    const sessions = parseSessions(lines);
    populateSessionData(sessions, lines);

    sessions.forEach(session => {
        /* commentsセッションで中身が空なら表示しない */
        if (session.title === 'comments') {
            const hasContent = session.talks.some(t =>
                t.questions.length > 0 || t.impressions.length > 0 || t.title !== 'comments');
            if (!hasContent) return;
        }

        if (session.title !== 'comments') {
            appendSectionHeader(fragment, session.title, () => jumpToLineId(session.id));
        }

        session.talks.forEach(talk => {
            /* commentsタイトルのtalkで中身が空なら表示しない */
            if (talk.title === 'comments' && talk.questions.length === 0 && talk.impressions.length === 0) return;

            const showTitle = talk.title !== 'comments';
            const titleNode = showTitle
                ? appendItemSub(fragment, '└ ' + talk.title, () => jumpToLineId(talk.id))
                : null;

            if (titleNode && enableOpenAI && talk.impressions.length >= 2) {
                attachAiSummaryButton(
                    titleNode,
                    `summary:${talk.id}`,
                    () => summarizeImpressionsByAuthor(talk.impressions)
                );
            }

            talk.questions.forEach(q => {
                appendItemMuted(fragment,
                    '　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
                    () => jumpToLineId(q.id)
                );
            });
        });
    });

    appendStatsBlock(fragment, rawLines);
    bodyNode.replaceChildren(fragment);
};
