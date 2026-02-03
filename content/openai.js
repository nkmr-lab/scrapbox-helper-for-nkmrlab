const isEnableOpenAI = async () => {
  return new Promise(resolve => {
    loadSettings(currentProjectName, settings => {
      resolve(!!settings.openaiApiKey);
    });
  });
};

const callOpenAI = async (prompt, content) => {
  const apiKey = await new Promise(resolve => {
    loadSettings(currentProjectName, s => {
      resolve(s.openaiApiKey || null);
    });
  });

  if (!apiKey) {
    throw new Error('OpenAI API Key is not set');
  }

  const res = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content }
        ],
        temperature: 0.3
      })
    }
  );

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
};


const groupByAuthor = (impressions) => {
    const map = {};
    impressions.forEach(({ author, text }) => {
        if (!map[author]) map[author] = [];
        map[author].push(text);
    });
    return map;
};  

const SUMMARY_PROMPT = `
    以下は研究発表に対する参加者ごとの感想です。
    各参加者について、感想をテンション高く20文字程度で要約してください。
    形式は「名前: 要約」のみ、改行区切りで出力してください。
    `;

const summarizeImpressionsByAuthor = async (impressions) => {
    if (impressions.length < 2) return null;

    const grouped = groupByAuthor(impressions);

    const input = Object.entries(grouped)
        .map(([author, texts]) =>
        `${author}:\n` + texts.map(t => `- ${t}`).join('\n')
        )
        .join('\n\n');

    return await callOpenAI(SUMMARY_PROMPT, input);
};