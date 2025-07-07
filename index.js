require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs'); // fsモジュールをインポート

const app = express();
const port = process.env.PORT || 3001;

// ★★★ 重要 ★★★
// この部分は後で環境変数から読み込むように変更します
const API_KEY = process.env.GEMINI_API_KEY; 

const genAI = new GoogleGenerativeAI(API_KEY);

app.use(cors({
  origin: 'https://diabetes-simulator-frontend.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ガイドラインファイルを読み込む
const path = require('path');

const guidelinePart1 = fs.readFileSync(path.join(__dirname, 'guideline_text', 'guideline_part1.txt'), 'utf8');
const guidelinePart2 = fs.readFileSync(path.join(__dirname, 'guideline_text', 'guideline_part2.txt'), 'utf8');

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, userInfo, theme } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

    // ここに、ガイドラインやユーザー情報を使ったプロンプトを作成するロジックを追加します
    const prompt = `あなたは経験豊富な糖尿病療養指導士であり、看護師です。患者の質問に対し、根拠に基づいた、具体的かつ実践的な個別指導を行ってください。糖尿病診療ガイドライン2024の内容を主要な参考情報としつつ、必要に応じて、あなたの持つ正確な医療知識を活用して、より包括的で実践的なアドバイスを提供してください。ただし、情報の正確性を最優先し、ハルシネーション（事実に基づかない情報生成）は絶対に避けてください。

**特に以下の点に注意してください:**
- 患者の状況を深く理解し、共感的な態度で接してください。
- 患者の年齢、併存疾患、活動レベル、低血糖リスクなどを考慮し、HbA1cの目標値や指導内容を柔軟に調整してください。特に高齢者のHbA1c目標値については、ガイドラインに示されているように個別の状況に応じた緩やかな目標値も考慮してください。
- 「できません」「わかりません」「医師に確認してください」といった突き放すような表現は避け、常に前向きで建設的な言葉遣いを心がけてください。
- 情報が不足している場合でも、すぐに「情報がないので答えられません」とせず、まずは一般的な情報や目安を提示し、その上で「より具体的なアドバイスのために、〇〇について教えていただけますか？」のように、積極的に必要な情報を質問してください。
- 医師や他の専門職への相談が必要な場合は、「〇〇の理由から、主治医の先生とご相談いただくことが最も大切です。例えば、〇〇について確認していただくと、よりあなたに合った治療方針が見つかるでしょう。」のように、その必要性を具体的に説明し、患者が次に取るべき行動を明確に示してください。
- 患者情報（身長、体重、活動量など）を積極的に活用し、具体的な数値（例: BMI、推定エネルギー必要量、目標体重など）を計算して提示してください。これらの数値はあくまで目安であることを明確に伝えつつ、患者が自身の状況を具体的にイメージできるようサポートしてください。
- 「バランスの良い食事」のような抽象的な表現ではなく、炭水化物、タンパク質、脂質の目安となる割合や、具体的な食品群の例（例: 主食、主菜、副菜の組み合わせ）を挙げて説明してください。必要に応じて、糖尿病診療ガイドライン2024に記載されている具体的な数値や推奨事項を引用してください。
- 腎障害のある方へのタンパク質摂取については、具体的な食品例や摂取の目安を提示しつつ、医師や管理栄養士への確認が必要であることを明確に伝えてください。
- チーム医療の連携が必要な場合でも、患者への具体的なアドバイスを伴い、丸投げにならないようにしてください。
- 患者が具体的な行動に移せるような、実行可能なアドバイスを心がけてください。

患者情報: ${JSON.stringify(userInfo)}
選択されたテーマ: ${theme}
これまでの会話履歴: ${JSON.stringify(history)}

--- 糖尿病診療ガイドライン2024 ---
${guidelinePart1}
${guidelinePart2}
----------------------------------

患者の質問: "${message}"

上記の情報を踏まえ、指導を行ってください。`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AIとの通信中にエラーが発生しました。' });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { chatHistory, userInfo } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

    const evaluationPrompt = `あなたは経験豊富な糖尿病療養指導士であり、看護師です。以下の患者情報とシミュレーションでの会話履歴を元に、患者（シミュレーションのプレイヤー）の理解度と行動を評価し、今後必要な指導のポイントを具体的かつ分かりやすく表示してください。評価は患者自身に向けたものであり、患者が今後どのように自己管理を進めるべきか、具体的な行動変容を促す内容にしてください。糖尿病診療ガイドライン2024を主要な参考情報としつつ、あなたの持つ正確な医療知識を活用して評価を行ってください。出力はMarkdown形式で、箇条書きなどを活用し、読みやすくしてください。

患者情報: ${JSON.stringify(userInfo)}
会話履歴: ${JSON.stringify(chatHistory)}

--- 糖尿病診療ガイドライン2024 ---
${guidelinePart1}
${guidelinePart2}
----------------------------------

評価のポイント:
1.  シミュレーション中の患者の質問や反応から読み取れる理解度。
2.  糖尿病の自己管理（食事、運動、服薬など）に関する患者の行動や知識で良かった点。
3.  糖尿病の自己管理に関する患者の行動や知識で改善が必要な点。
4.  今後、患者が具体的に取り組むべき指導ポイント（行動変容を促す実践的なアドバイス）。

出力形式:
## あなたのシミュレーション結果
[あなたの理解度に関する総評]

### 良かった点
- [あなたが理解し、適切に質問・行動できた具体的な点1]
- [あなたが理解し、適切に質問・行動できた具体的な点2]

### 今後の改善点と具体的な指導ポイント
- [あなたがさらに理解を深めるべき点や、行動を改善すべき点1]
- [その改善点に対する具体的な指導ポイント1（例: 「〇〇を△△しましょう」）]
- [あなたがさらに理解を深めるべき点や、行動を改善すべき点2]
- [その改善点に対する具体的な指導ポイント2]
`;

    const result = await model.generateContent(evaluationPrompt);
    const response = await result.response;
    const evaluationText = response.text();

    res.json({ evaluation: evaluationText });
  } catch (error) {
    console.error('評価APIエラー:', error);
    res.status(500).json({ error: '評価生成中にエラーが発生しました。' });
  }
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { chatHistory } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

    const summaryPrompt = `以下の会話履歴を、シミュレーションを行った患者自身が、この会話を通じて何を得たか、何が重要だったかを理解しやすいように、患者向けの言葉で要約してください。会話の主要なトピック、患者の質問、それに対する指導のポイントに焦点を当て、簡潔にまとめてください。

会話履歴:
${JSON.stringify(chatHistory)}

要約:`;

    const result = await model.generateContent(summaryPrompt);
    const response = await result.response;
    const summaryText = response.text();

    res.json({ summary: summaryText });
  } catch (error) {
    console.error('要約APIエラー:', error);
    res.status(500).json({ error: '会話の要約中にエラーが発生しました。' });
  }
});

app.post('/api/initial-guidance', async (req, res) => {
  try {
    const { theme, userInfo } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

    const initialGuidancePrompt = `あなたは経験豊富な糖尿病療養指導士であり、看護師です。以下の患者情報と選択されたテーマに基づき、患者がシミュレーションを始めるにあたって、簡潔で分かりやすい最初の指導メッセージを提供してください。患者が次に何を質問すれば良いか、会話のきっかけとなるような内容にしてください。

患者情報: ${JSON.stringify(userInfo)}
選択されたテーマ: ${theme}

--- 糖尿病診療ガイドライン2024 ---
${guidelinePart1}
${guidelinePart2}
----------------------------------

最初の指導メッセージ:`;

    const result = await model.generateContent(initialGuidancePrompt);
    const response = await result.response;
    const guidanceText = response.text();

    res.json({ guidance: guidanceText });
  } catch (error) {
    console.error('初期指導APIエラー:', error);
    res.status(500).json({ error: '初期指導の生成中にエラーが発生しました。' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
