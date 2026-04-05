/* ==================== 議事録 ====================== */

/* セッションとトークの構造をテキスト行から抽出する */
const parseSessions = (lines) => {
    const sessions = [];
    let currentSession = null;
    let currentTalk = null;

    lines.forEach((line, idx) => {
        const text = line.text || '';

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

        if (isSubHeadingLine(text) && currentTalk) {
            currentTalk.subheadings.push({
                id: line.id, title: cleanTitle(text), idx,
                questions: []
            });
            return;
        }

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

/* 各トークに質問・感想を割り当て、サブ見出しにも質問を紐づける */
const populateSessionData = (sessions, lines) => {
    sessions.forEach(session => {
        session.talks.forEach((talk, i) => {
            const talkStart = talk.idx + 1;
            const talkEnd = i + 1 < session.talks.length ? session.talks[i + 1].idx - 1 : session.endIdx;

            talk.impressions = collectImpressions(lines, talkStart, talkEnd);

            /* サブ見出しがある場合、各サブ見出しの範囲で質問を収集 */
            if (talk.subheadings.length > 0) {
                /* サブ見出し前の範囲の質問はtalk直下に */
                const firstSubIdx = talk.subheadings[0].idx;
                talk.questions = collectQuestions(lines, talkStart, firstSubIdx - 1);

                /* 各サブ見出しの範囲で質問を収集 */
                talk.subheadings.forEach((sub, j) => {
                    const subStart = sub.idx + 1;
                    const subEnd = j + 1 < talk.subheadings.length
                        ? talk.subheadings[j + 1].idx - 1
                        : talkEnd;
                    sub.questions = collectQuestions(lines, subStart, subEnd);
                });
            } else {
                /* サブ見出しなし → 従来通りtalk全体で質問収集 */
                talk.questions = collectQuestions(lines, talkStart, talkEnd);
            }
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

            /* talk直下の質問 */
            talk.questions.forEach(q => {
                appendItemMuted(fragment,
                    '　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
                    () => jumpToLineId(q.id)
                );
            });

            /* サブ見出し + その下の質問 */
            talk.subheadings.forEach(sub => {
                appendItemMuted(fragment,
                    '　　' + sub.title,
                    () => jumpToLineId(sub.id)
                );

                sub.questions.forEach(q => {
                    appendItemMuted(fragment,
                        '　　　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
                        () => jumpToLineId(q.id)
                    );
                });
            });
        });
    });

    const statsBlock = renderTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
