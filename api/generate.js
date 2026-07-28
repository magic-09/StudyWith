export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const { prompt, dday } = req.body;

  let requestPrompt = "";
  if (dday !== undefined) {
    requestPrompt = `2027학년도 수능 D-${dday}입니다. 수험생을 위한 따뜻하고 동기부여가 되는 2~3줄의 응원 메시지를 작성해 주세요.`;
  } else if (prompt) {
    requestPrompt = `다음은 학생의 성적 및 학습 상태 정보입니다:
"${prompt}"

위 정보를 바탕으로 이 학생을 [상위권], [중위권], [하위권] 중 어느 반에 배치할지 결정해 주시고, 그 반으로 선정한 이유와 구체적인 과목별 맞춤 공부 전략을 친절하고 상세하게 작성해 주세요. 반드시 답변 상단이나 본문에 '[상위권]', '[중위권]', '[하위권]' 키워드 중 하나를 명확히 포함해 주세요.`;
  } else {
    return res.status(400).json({ error: '요청 데이터(prompt 또는 dday)가 필요합니다.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: requestPrompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API 오류' });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답이 없습니다.";
    return res.status(200).json({ result: generatedText });

  } catch (err) {
    return res.status(500).json({ error: '서버 에러: ' + err.message });
  }
}
