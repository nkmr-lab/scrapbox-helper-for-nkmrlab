/* ================= API ================= */
/*
 * Scrapbox API と OpenAI API のラッパー。
 * AI結果のメモリキャッシュもここで管理する。
 * 依存: config.js (loadSettings), constants.js (currentProjectName)
 */

const OPENAI_MODEL = 'gpt-4.1-mini';

/* --- Scrapbox API --- */
/* Scrapboxページをフェッチして返す */
const fetchPage = async (projectName, pageName) => {
    if (projectName === null) return null;
    const r = await fetch(
        `https://scrapbox.io/api/pages/${projectName}/${encodeURIComponent(pageName)}`
    );
    if (!r.ok) { console.warn(`[SB Helper] fetchPage failed: ${r.status} ${projectName}/${pageName}`); return null; }
    return r.json();
};

/* プロジェクトメンバーの uid → displayName マップを取得する（プロジェクト単位でメモ化）。
   /api/pages のレスポンスには users の id しか入らないので別エンドポイントから引く。 */
const _projectUsersCache = {};

const loadProjectUsers = async (projectName) => {
    if (!projectName) return {};
    if (_projectUsersCache[projectName]) return _projectUsersCache[projectName];
    try {
        const r = await fetch(`https://scrapbox.io/api/projects/${projectName}`);
        if (!r.ok) { console.warn(`[SB Helper] loadProjectUsers failed: ${r.status} ${projectName}`); return {}; }
        const json = await r.json();
        const map = {};
        const register = (u) => {
            if (!u?.id) return;
            const name = u.displayName || u.name;
            if (name && !map[u.id]) map[u.id] = name;
        };
        (json.users || []).forEach(register);
        (json.admins || []).forEach(register);
        register(json.owner);
        _projectUsersCache[projectName] = map;
        return map;
    } catch (e) {
        console.warn('[SB Helper] loadProjectUsers error:', e);
        return {};
    }
};

/* ページのETagをHEADリクエストで取得する */
const headPageETag = async (projectName, pageName) => {
    try {
        const r = await fetch(
            `https://scrapbox.io/api/pages/${projectName}/${encodeURIComponent(pageName)}`,
            { method: 'HEAD' }
        );
        if (!r.ok) return null;
        return r.headers.get('etag').substring(3, 8);
    } catch {
        return null;
    }
};

/* --- OpenAI API --- */
/* OpenAI APIキーが設定済みか判定する */
const isOpenAIEnabled = async () => {
    const settings = await loadSettings(currentProjectName);
    return !!settings.openaiApiKey;
};

/* OpenAI APIにプロンプトを送信して応答テキストを返す（apiKeyは省略時に設定から取得） */
const callOpenAI = async (prompt, content, apiKey = null) => {
    if (!apiKey) {
        const settings = await loadSettings(currentProjectName);
        apiKey = settings.openaiApiKey;
    }
    if (!apiKey) throw new Error('OpenAI API Key is not set');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content }
            ],
            temperature: 0.3
        })
    });

    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
};

/* --- 感想要約 --- */
const SUMMARY_PROMPT = `
以下は研究発表に対する参加者ごとの感想です。
各参加者について、感想をテンション高く20文字程度で要約してください。
形式は「名前: 要約」のみ、改行区切りで出力してください。
`;

/* 著者ごとの感想をAIで要約する */
const summarizeImpressionsByAuthor = async (impressions) => {
    if (impressions.length < 2) return null;

    const grouped = {};
    impressions.forEach(({ author, text }) => {
        if (!grouped[author]) grouped[author] = [];
        grouped[author].push(text);
    });

    const input = Object.entries(grouped)
        .map(([author, texts]) => `${author}:\n` + texts.map(t => `- ${t}`).join('\n'))
        .join('\n\n');

    const settings = await loadSettings(currentProjectName);
    const prompt = settings.promptSummary || SUMMARY_PROMPT;
    return await callOpenAI(prompt, input, settings.openaiApiKey);
};

/* --- ユーティリティ --- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* --- AI結果キャッシュ（ページ遷移でクリア） --- */
const _aiCache = new Map();
const clearAiCache = () => _aiCache.clear();
const getCachedAiResult = (key) => _aiCache.get(key) ?? null;
const setCachedAiResult = (key, value) => _aiCache.set(key, value);
