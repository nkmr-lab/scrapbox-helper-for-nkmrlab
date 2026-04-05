/* ==================== 議事録 ====================== */

const renderMinutesFromLines = async (rawLines) => {
    const enableOpenAI = await isEnableOpenAI();
    const lines = normalizeLines(rawLines, { withUid: true });

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, createStandardPanel);
    const { bodyNode } = setupPanelHeader(panelNode, rawLines);
    const fragment = document.createDocumentFragment();

    /* 1. session / title 抽出 */
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

    /* 2. 質問・感想 抽出 */
    const isBoundaryLine = (text) =>
        isSessionStart(text) || isTitleLine(text) || extractIconName(text) || /^\?\s*/.test(text);

    const collectImpressions = (start, end) => {
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

    sessions.forEach(session => {
        session.talks.forEach((talk, i) => {
            const start = talk.idx + 1;
            const end = i + 1 < session.talks.length ? session.talks[i + 1].idx - 1 : session.endIdx;
            talk.questions = collectQuestions(lines, start, end);
            talk.impressions = collectImpressions(start, end);
        });

        if (session.talks.length === 0) {
            const ims = collectImpressions(session.startIdx, session.endIdx);
            const qs = collectQuestions(lines, session.startIdx, session.endIdx);
            if (ims.length || qs.length) {
                session.talks.push({
                    id: session.id, title: 'comments', idx: session.startIdx,
                    questions: qs, impressions: ims
                });
            }
        }
    });

    /* 3. 描画 */
    sessions.forEach(session => {
        appendSectionHeader(fragment, session.title, () => jumpToLineId(session.id));

        session.talks.forEach(talk => {
            const titleNode = appendItemSub(fragment, '└ ' + talk.title, () => jumpToLineId(talk.id));

            if (enableOpenAI && talk.impressions.length >= 2) {
                const btn = document.createElement('span');
                btn.textContent = ' 🧠';
                btn.className = 'sb-ai-btn';
                btn.onclick = async () => {
                    btn.textContent = ' ⏳';
                    const summary = await summarizeImpressionsByAuthor(talk.impressions);
                    btn.textContent = ' 🧠';
                    if (!summary) return;
                    const box = document.createElement('div');
                    box.className = 'sb-ai-summary';
                    box.textContent = '🧠 AI要約\n' + summary;
                    titleNode.after(box);
                };
                titleNode.appendChild(btn);
            }

            talk.questions.forEach(q => {
                appendItemMuted(fragment,
                    '　　' + (q.author ? `${q.author}: ` : '?: ') + q.text,
                    () => jumpToLineId(q.id)
                );
            });
        });
    });

    const statsBlock = createTalkStatsBlock(rawLines);
    if (statsBlock) fragment.appendChild(statsBlock);
    bodyNode.replaceChildren(fragment);
};
