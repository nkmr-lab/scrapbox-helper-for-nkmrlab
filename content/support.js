/* ================= 共通ユーティリティ ================= */
const normalizeLines = (rawLines, { withUid = false } = {}) => {
    return rawLines.map(l => {
        const line = {
            id: l.id,
            text: (l.text || '').trim()
        };
        if (withUid) {
            line.uid = l.userId || l.createdBy || l.updatedBy || 'unknown';
        }
        return line;
    });
};

const fetchPage = async (projectName, pageName) => {
    if (projectName === null) return null;
    //console.log("get :" + projectName + "/" + pageName);
    const r = await fetch(
        `https://scrapbox.io/api/pages/${projectName}/${encodeURIComponent(pageName)}`
    );
    if (!r.ok) return null;
    return r.json();
};

const headPageETag = async (projectName, pageName) => {
    //console.log("head:" + projectName + "/" + pageName);
    try {
        const r = await fetch(
        `https://scrapbox.io/api/pages/${projectName}/${encodeURIComponent(pageName)}`,
        { method: 'HEAD' }
        );
        if (!r.ok) return null;
        // W/"XXXXX-YYYYYY ... という形式になってて、W/"以降の5文字がページの更新情報っぽい
        //console.log(r.headers.get('etag').substring(3, 8));
        return r.headers.get('etag').substring(3, 8);
    } catch {
        return null;
    }
};

const isPaperIntroPage = (lines) =>
    lines.some(line => (line.text || '').includes('#論文紹介'));

const isContextBoundary = (text) => {
    if (!text) return true;                 // 空行
    if (/^\[\*+\s/.test(text)) return true; // 見出し ([*, [**, [***)
    return false;
};

const extractIconName = (text) => {
    const m = text.match(/^\[([^\]\/]+)\.icon\]/);
    return m ? m[1] : null;
};

const findAuthorAbove = (lines, fromIndex) => {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const text = lines[i].text;

        if (isContextBoundary(text)) break;
        const name = extractIconName(text);
        if (name) return name;
    }
    return null;
};

const isTitleLine = (t) =>
    !!parseBracketTitle(t) || /^タイトル\s*[:：『「]/.test(t);

const cleanTitle = (t) => {
    const parsed = parseBracketTitle(t);
    if (parsed) return parsed;

    // fallback: タイトル: 系
    return t
        .replace(/^タイトル\s*[:：『「]\s*/, '')
        .replace(/[』」]\s*$/, '')
        .trim();
};

const isSessionStart = (t) => {
    const title = parseBracketTitle(t);
    return title && t.includes('(');
};

const parseBracketTitle = (text) => {
    if (!text.startsWith('[')) return null;

    // [装飾 + 空白 + 本文]
    const m = text.match(/^\[([\*\(\&]+)\s+(.+?)]$/);
    if (!m) return null;

    const decorators = m[1]; // "*", "**", "(", "*(", "(**", "&*", etc
    const title = m[2].trim();

    // ✕なのは「* が1個だけ」の場合のみ
    if (decorators === '*') return null;

    return title;
};

const getDeoratorFromLine = (text) => {
    if (!text.startsWith('[')) return null;

    // [装飾 + 空白 + 本文]
    const m = text.match(/^\[([\*\(\&]+)\s+(.+?)]$/);
    if (!m) return null;

    const decorators = m[1]; // "*", "**", "(", "*(", "(**", "&*", etc
    return decorators;
};