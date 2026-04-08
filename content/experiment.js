/* ================= 実験計画書 ================= */

/* --- 定数 --- */

const EXPERIMENT_REVIEW_PROMPT = `
以下は研究の実験計画書の一部です。
このセクションについて、研究計画として問題がないかをチェックしてください。

特に次の観点で確認してください：
- 曖昧・抽象的すぎる表現
- 実験で検証可能か不明な点
- 条件・手続き・評価指標の不足や矛盾
- 査読者に突っ込まれそうな点

問題がある場合のみ、簡潔な箇条書きで指摘してください。
問題がなければ「特に問題は見当たりません」と答えてください。
`;

/* --- GPTレビュー --- */

/* 単一セクションをGPTでレビューして結果を表示する */
const runSingleSectionReview = async (section) => {
    const cacheKey = `review:${section.id}`;
    const cached = getCachedAiResult(cacheKey);

    let resultBox = section._resultBox;
    if (!resultBox) {
        resultBox = document.createElement('div');
        resultBox.className = 'sb-review-box';
        section.node.after(resultBox);
        section._resultBox = resultBox;
    }

    if (cached) {
        resultBox.textContent = cached.text;
        resultBox.className = 'sb-review-box ' + cached.cls;
        return;
    }

    resultBox.textContent = '⏳ GPTが確認中…';
    resultBox.className = 'sb-review-box';

    const content =
        `【セクション名】\n${section.title}\n\n` +
        `【内容】\n` + section.contents.map(t => `- ${t}`).join('\n');

    try {
        const settings = await loadSettings(currentProjectName);
        const prompt = settings.promptExperimentReview || EXPERIMENT_REVIEW_PROMPT;
        const res = await callOpenAI(prompt, content);
        if (!res || /問題は見当たりません/.test(res)) {
            resultBox.textContent = '✅ 特に問題は見当たりません';
            resultBox.className = 'sb-review-box sb-review-box--ok';
            setCachedAiResult(cacheKey, { text: resultBox.textContent, cls: 'sb-review-box--ok' });
        } else {
            resultBox.textContent = res;
            resultBox.className = 'sb-review-box sb-review-box--ng';
            setCachedAiResult(cacheKey, { text: res, cls: 'sb-review-box--ng' });
        }
    } catch (e) {
        resultBox.textContent = '❌ GPTレビューでエラーが発生しました';
        resultBox.className = 'sb-review-box sb-review-box--ng';
        console.error(e);
    }
};

/* 複数セクションを順番にGPTレビューする */
const runBatchGPTReview = async (sections, statusNode) => {
    let index = 0;
    for (const section of sections) {
        index++;
        statusNode.textContent = `(${index} / ${sections.length}) 「${section.title}」をチェック中…`;
        if (!section.contents || section.contents.length === 0) continue;
        await runSingleSectionReview(section);
        await sleep(400);
    }
};

/* --- View --- */

/* GPT一括レビューのUIボタンを生成する */
const renderGPTBatchReviewUI = (sections) => {
    const box = document.createElement('div');
    box.className = 'sb-batch-ui';

    const btn = document.createElement('button');
    btn.textContent = '🧠 GPTで全部チェック';
    btn.className = 'sb-small-btn';

    const status = document.createElement('span');
    status.className = 'sb-batch-status';

    box.append(btn, status);

    btn.onclick = async () => {
        btn.disabled = true;
        status.textContent = '開始中…';
        await runBatchGPTReview(sections, status);
        status.textContent = '完了';
        btn.disabled = false;
    };

    return box;
};

/* --- メイン描画 --- */

/* 実験計画書ページをフェッチしてパネルに描画する */
const renderExperimentPlan = async (pageName) => {
    const json = await fetchPage(currentProjectName, pageName);
    if (!json) return;

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, renderStandardPanel);
    const { bodyNode } = setupPanelHeader(panelNode, json.lines, '📋');
    const fragment = document.createDocumentFragment();

    let currentSection = null;
    const sections = [];

    json.lines.forEach(line => {
        const text = (line.text || '').trim();
        if (!text) return;

        if (/^\[\*{3,}\(&/.test(text)) {
            const title = text.replace(/^\[\*+\(&\s*/, '').replace(/\]$/, '');
            const sectionNode = appendSectionHeader(fragment, '■ ' + title, () => jumpToLineId(line.id));
            currentSection = { title, id: line.id, contents: [], node: sectionNode };
            sections.push(currentSection);
            return;
        }

        if (!currentSection) return;

        if (/^\[\*&\s+/.test(text)) {
            const titleText = text.replace(/^\[\*&\s*/, '').replace(/\]$/, '');
            appendItem(fragment, '└ ' + titleText, () => jumpToLineId(line.id));
            currentSection.contents.push(`【項目】${titleText}`);
            return;
        }

        currentSection.contents.push(text);
    });

    if (await isOpenAIEnabled() && sections.length > 0) {
        const batchUI = renderGPTBatchReviewUI(sections);
        fragment.prepend(batchUI);
    }

    bodyNode.replaceChildren(fragment);
};
