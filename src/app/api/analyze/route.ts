import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "문장을 입력해주세요." },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `당신은 실용 영어 전문 교정 AI '집필중'입니다. 
사용자의 입력(한글 또는 어색한 영문)을 받아 가장 자연스러운 원어민 비즈니스/일상 영어 문장으로 교정하고, 해당 문장의 완벽한 한국어 뜻과 단어별 분해 정보를 제공하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "corrected": "완벽하게 교정된 영문장 1개",
  "korean_translation": "교정된 영문장의 자연스러운 한국어 완역 문장 1개",
  "explanation": "왜 이렇게 교정했는지에 대한 뉘앙스/문법 설명 (한국어 1~2문장)",
  "tokens": [
    { "word": "단어 또는 숙어", "pos": "품사 (반드시 한국어로)", "meaning": "한국어 뜻" } 
  ]
}

🚨 중요 규칙: 
tokens 배열 안의 'pos' 값은 절대로 영어를 쓰지 마세요. 반드시 '명사', '동사', '형용사', '부사', '전치사', '접속사', '대명사' 등 명확한 한국어 품사 명칭으로만 출력해야 합니다.`, // 👈 추가된 부분
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: "문장 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}