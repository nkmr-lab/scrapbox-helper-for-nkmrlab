/* ================= 実験計画書 ================= */

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

const renderExperimentPlan = async (pageName) => {
    const json = await fetchPage(currentProjectName, pageName);
    if (!json) return;

    const panelNode = getOrCreatePanel(MAIN_PANEL_ID, () => {
        const p = document.createElement('div');
        applyStyle(p, Styles.panel.base);
        applyPanelSettings(p, 'main');
        return p;
    });
    panelNode.innerHTML = '';

    const titleNode = renderPageTitle(panelNode, json.lines);
    attachCloseButton(panelNode, MAIN_PANEL_ID);

    let currentSection = null;
    const sections = [];

    json.lines.forEach(line => {
        const text = (line.text || '').trim();
        if (!text) return;

        /* セクション見出し */
        if (/^\[\*{3,}\(&/.test(text)) {
            const title = text
                .replace(/^\[\*+\(&\s*/, '')
                .replace(/\]$/, '');

            const sectionNode = appendSectionHeader(
                panelNode,
                '\u25a0 ' + title,
                () => jumpToLineId(line.id)
            );

            currentSection = {
                title,
                id: line.id,
                contents: [],
                node: sectionNode
            };
            sections.push(currentSection);
            return;
        }

        if (!currentSection) return;

        /* タイトル行 */
        if (/^\[\*&\s+/.test(text)) {
            const titleText = text
                .replace(/^\[\*&\s*/, '')
                .replace(/\]$/, '');

            appendTextNode(
                panelNode,
                '\u2514 ' + titleText,
                ITEM_STYLE,
                () => jumpToLineId(line.id)
            );

            currentSection.contents.push(`\u3010\u9805\u76ee\u3011${titleText}`);
            return;
        }

        /* 通常テキスト */
        currentSection.contents.push(text);
    });

    /* GPTレビューUI */
    if (titleNode && await isEnableOpenAI() && sections.length > 0) {
        const batchUI = createGPTBatchReviewUI(sections);
        titleNode.after(batchUI);
    }

    document.body.appendChild(panelNode);
};

const runBatchGPTReview = async (sections, statusNode) => {
    const total = sections.length;
    let index = 0;

    for (const section of sections) {
        index++;
        statusNode.textContent = `(${index} / ${total}) \u300c${section.title}\u300d\u3092\u30c1\u30a7\u30c3\u30af\u4e2d\u2026`;

        if (!section.contents || section.contents.length === 0) continue;

        await runSingleSectionReview(section);
        await sleep(400);
    }
};

const runSingleSectionReview = async (section) => {
    if (section._reviewed) return;
    section._reviewed = true;

    let resultBox = section._resultBox;
    if (!resultBox) {
        resultBox = document.createElement('div');
        resultBox.style =
            'margin:4px 12px 8px 12px;padding:6px;' +
            `border-left:3px solid ${Theme.aiSummaryBorder};font-size:12px;white-space:pre-wrap;`;
        section.node.after(resultBox);
        section._resultBox = resultBox;
    }

    resultBox.textContent = '\u23f3 GPT\u304c\u78ba\u8a8d\u4e2d\u2026';

    const content =
        `\u3010\u30bb\u30af\u30b7\u30e7\u30f3\u540d\u3011\n${section.title}\n\n` +
        `\u3010\u5185\u5bb9\u3011\n` +
        section.contents.map(t => `- ${t}`).join('\n');

    try {
        const res = await callOpenAI(EXPERIMENT_REVIEW_PROMPT, content);

        if (!res || /\u554f\u984c\u306f\u898b\u5f53\u305f\u308a\u307e\u305b\u3093/.test(res)) {
            resultBox.textContent = '\u2705 \u7279\u306b\u554f\u984c\u306f\u898b\u5f53\u305f\u308a\u307e\u305b\u3093';
            resultBox.style.borderLeftColor = Theme.reviewOk;
        } else {
            resultBox.textContent = res;
            resultBox.style.borderLeftColor = Theme.reviewNg;
        }
    } catch (e) {
        resultBox.textContent = '\u274c GPT\u30ec\u30d3\u30e5\u30fc\u3067\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f';
        resultBox.style.borderLeftColor = Theme.reviewNg;
        console.error(e);
    }
};

const createGPTBatchReviewUI = (sections) => {
    const box = document.createElement('div');
    box.style = `margin:4px 0 8px 0;padding:6px 0;border-bottom:1px solid ${Theme.border};`;

    const btn = document.createElement('button');
    btn.textContent = '\ud83e\udde0 GPT\u3067\u5168\u90e8\u30c1\u30a7\u30c3\u30af';
    btn.style = 'font-size:12px;cursor:pointer;';

    const status = document.createElement('span');
    status.style = `margin-left:10px;font-size:11px;color:${Theme.textFaint}`;

    box.append(btn, status);

    btn.onclick = async () => {
        btn.disabled = true;
        status.textContent = '\u958b\u59cb\u4e2d\u2026';
        await runBatchGPTReview(sections, status);
        status.textContent = '\u5b8c\u4e86';
        btn.disabled = false;
    };

    return box;
};
