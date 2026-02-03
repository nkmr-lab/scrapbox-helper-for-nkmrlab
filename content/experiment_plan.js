/* ================= 実験計画書 ================= */
const createExperimentPlanPanel = () => {
    const panelNode = document.createElement('div');
    applyStyle(panelNode, Styles.panel.base);
    applyPanelSettings(panelNode);
    return panelNode;
};

const attachGPTReviewUI = (panelNode, section) => {
  if (!section.contents.length) return;

  const btn = document.createElement('div');
  btn.textContent = '🤖 GPTレビュー';
  btn.style =
    'margin:4px 0 8px 12px; cursor:pointer; color:#1565c0; font-size:12px;';

  const resultBox = document.createElement('div');
  resultBox.style =
    'margin:4px 12px 8px 12px; padding:6px; ' +
    'border-left:3px solid #ccc; font-size:12px; display:none; white-space:pre-wrap;';

  let loading = false;

  btn.onclick = async () => {
    if (loading) return;
    loading = true;

    resultBox.style.display = 'block';
    resultBox.textContent = '⏳ GPTが確認中…';

    const content =
      `【セクション名】\n${section.title}\n\n` +
      `【内容】\n` +
      section.contents.map(l => `- ${l}`).join('\n');

    try {
      const res = await callOpenAI(
        EXPERIMENT_REVIEW_PROMPT,
        content
      );
      resultBox.textContent = res || '⚠️ レビュー結果を取得できませんでした';
    } catch (e) {
      resultBox.textContent = '❌ GPTレビュー中にエラーが発生しました';
      console.error(e);
    } finally {
      loading = false;
    }
  };

  // セクション直下に差し込む
  section.node.after(btn, resultBox);
};


const renderExperimentPlan = async (pageName) => {
  const json = await fetchPage(currentProjectName, pageName);
  if (!json) return;

  const panelNode = getOrCreatePanel(
    MAIN_PANEL_ID,
    createExperimentPlanPanel
  );
  panelNode.innerHTML = '';

  const titleNode = renderPageTitle(panelNode, json.lines);
  attachCloseButton(panelNode, MAIN_PANEL_ID);

  let currentSection = null;
  const sections = [];

  json.lines.forEach(line => {
    const raw = line.text || '';
    const text = raw.trim();
    if (!text) return;

    /* ===== セクション見出し ===== */
    if (/^\[\*{3,}\(&/.test(text)) {
      const title = text
        .replace(/^\[\*+\(&\s*/, '')
        .replace(/\]$/, '');

      const sectionNode = appendSectionHeader(
        panelNode,
        '■ ' + title,
        () => jumpToLineId(line.id)
      );

      currentSection = {
        title,
        id: line.id,
        contents: [],   // ← GPT分析用（タイトル＋本文）
        node: sectionNode
      };
      sections.push(currentSection);
      return;
    }

    if (!currentSection) return;

    /* ===== タイトル行（UIに表示） ===== */
    if (/^\[\*&\s+/.test(text)) {
      const titleText = text
        .replace(/^\[\*&\s*/, '')
        .replace(/\]$/, '');

      // UI表示（従来どおり）
      appendTextNode(
        panelNode,
        '└ ' + titleText,
        [Styles.text.item, Styles.list.ellipsis].join(""),
        () => jumpToLineId(line.id)
      );

      
      // GPT分析にも含める
      currentSection.contents.push(`【項目】${titleText}`);
      return;
    }


    /* ===== 通常テキスト（UIには出さない） ===== */
    currentSection.contents.push(text);
  });

  /* ===== GPTレビューUI ===== */
//   if (isEnableOpenAI()) {
//     sections.forEach(section => {
//       if (section.contents.length > 0) {
//         attachGPTReviewUI(panelNode, section);
//       }
//     });
//   }

    // if (await isEnableOpenAI()) {
    //     attachGPTBatchReviewUI(panelNode, sections);
    // }

  if (await isEnableOpenAI() && sections.length > 0) {
    const batchUI = createGPTBatchReviewUI(sections);
    titleNode.after(batchUI);   // ← ★ここがポイント
  }

  document.body.appendChild(panelNode);

};

const runBatchGPTReview = async (sections, statusNode) => {
  const total = sections.length;
  let index = 0;

  for (const section of sections) {
    index++;

    statusNode.textContent =
      `(${index} / ${total}) 「${section.title}」をチェック中…`;

    // 空セクションはスキップ
    if (!section.contents || section.contents.length === 0) {
      continue;
    }

    await runSingleSectionReview(section);

    // UIを落ち着かせるための小休止（重要）
    await sleep(400);
  }
};

const runSingleSectionReview = async (section) => {
  if (section._reviewed) return; // 二重実行防止
  section._reviewed = true;

  let resultBox = section._resultBox;
  if (!resultBox) {
    resultBox = document.createElement('div');
    resultBox.style =
      'margin:4px 12px 8px 12px; padding:6px;' +
      'border-left:3px solid #ccc; font-size:12px;' +
      'white-space:pre-wrap;';
    section.node.after(resultBox);
    section._resultBox = resultBox;
  }

  resultBox.textContent = '⏳ GPTが確認中…';

  const content =
    `【セクション名】\n${section.title}\n\n` +
    `【内容】\n` +
    section.contents.map(t => `- ${t}`).join('\n');

  try {
    const res = await callOpenAI(
      EXPERIMENT_REVIEW_PROMPT,
      content
    );

    if (!res || /問題は見当たりません/.test(res)) {
      resultBox.textContent = '✅ 特に問題は見当たりません';
      resultBox.style.borderLeftColor = '#4caf50';
    } else {
      resultBox.textContent = res;
      resultBox.style.borderLeftColor = '#f44336';
    }
  } catch (e) {
    resultBox.textContent = '❌ GPTレビューでエラーが発生しました';
    resultBox.style.borderLeftColor = '#f44336';
    console.error(e);
  }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const createGPTBatchReviewUI = (sections) => {
  const box = document.createElement('div');
  box.style =
    'margin:4px 0 8px 0; padding:6px 0;' +
    'border-bottom:1px solid #ddd;';

  const btn = document.createElement('button');
  btn.textContent = '🧠 GPTで全部チェック';
  btn.style = 'font-size:12px; cursor:pointer;';

  const status = document.createElement('span');
  status.style = 'margin-left:10px; font-size:11px; color:#666';

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
