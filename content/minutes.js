/* ==================== 議事録 ====================== */

/* セッションとトークの構造をテキスト行から抽出する */
const parseSessions = (lines) => {
    const sessions = [];
    let currentSession = null;
    let currentTalk = null;

    lines.forEach((line, idx) => {
        const text = line.text || '';

        /* セッション開始 */
        if (isSessionStart(text)) {
            currentTalk = null;
            currentSession = {
                id: line.id,
                title: text.replace(/^\[[^\s]+\s*/, '').replace(/\]$/, ''),
                talks: [], startIdx: idx, endIdx: null
            };
            sessions.push(currentSession);
            return;
        }

        /* 発表タイトル（&付き装飾） */
        if (isTalkTitleLine(text)) {
            if (!currentSession) {
                currentSession = { id: line.id, title: 'comments', talks: [], startIdx: idx, endIdx: null };
                sessions.push(currentSession);
            }
            currentTalk = {
                id: line.id, title: cleanTitle(text), idx,
                questions: [], impressions: [], subheadings: []
            };
            currentSession.talks.push(currentTalk);
            return;
        }

        /* サブ見出し（概要・質疑・コメント等） → 直前のtalkに紐づける */
        if (isSubHeadingLine(text) && currentTalk) {
            currentTalk.subheadings.push({ id: line.id, title: cleanTitle(text) });
            return;
        }

        /* 従来のタイトル行（&なし、セッションでもサブ見出しでもない） */
        if (isTitleLine(text)) {
            if (!currentSession) {
                currentSession = { id: line.id, title: 'comments', talks: [], startIdx: idx, endIdx: null };
                sessions.push(currentSession);
            }
            currentTalk = {
                id: line.id, title: cleanTitle(text), idx,
                questions: [], impressions: [], subheadings: []
            };
            currentSession.talks.push(currentTalk);
        }
    });

    if (sessions.length === 0) {
        const firstTitleIdx = lines.findIndex(l => isTitleLine(l.text));
        if (firstTitleIdx !== -1) {
            sessions.push({
                id: lines[firstTitleIdx].id, title: 'comments',
                talks: [{ id: lines[firstTitleIdx].id, title: cleanTitle(lines[firstTitleIdx].text),
                    idx: firstTitleIdx, questions: [], impressions: [], subheadings: [] }],
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
                    questions: qs, impressions: ims, subheadings: []
                });
            }
        }
    });
};

/* 議事録の行データをパースしてパネルに描画する */
const renderMinutesFromLines = async (rawLines) => {
    const enableOpenAI = await isOpenAIEnabled();
    const lines = normalizeLines(rawLines, { withUid: true });

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    const { bodyNode } = setupPanelHeader(panelNode, rawLines);
    const fragment = document.createDocumentFragment();

    const sessions = parseSessions(lines);
    populateSessionData(sessions, lines);

    /* 描画 */
    sessions.forEach(session => {
        appendSectionHeader(fragment, session.title, () => jumpToLineId(session.id));

        session.talks.forEach(talk => {
            const titleNode = appendItemSub(fragment, '└ ' + talk.title, () => jumpToLineId(talk.id));

            if (enableOpenAI && talk.impressions.length >= 2) {
                attachAiSummaryButton(
                    titleNode,
                    `summary:${talk.id}`,
                    () => summarizeImpressionsByAuthor(talk.impressions)
                );
            }

            /* サブ見出し（概要・質疑等）をタイトルの子としてインデント表示 */
            talk.subheadings.forEach(sub => {
                appendItemMuted(fragment,
                    '　　📎 ' + sub.title,
                    () => jumpToLineId(sub.id)
                );
            });

            talk.questions.forEach(q => {
                appendItemMuted(fragment,
                    '　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
                    () => jumpToLineId(q.id)
                );
            });
        });
    });

    const statsBlock = renderTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
