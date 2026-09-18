import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, episodeId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "메시지가 없습니다." }, { status: 400 });
    }

    // 🎯 1. 힌트 AI에게도 현재 에피소드 목표를 알려줌
    let scenarioContext = "";
    if (episodeId === 'movie') {
      scenarioContext = "현재 주말 영화관람(영화 장르 고르기 -> 팝콘 주문하기 -> 좌석 예매하기) 에피소드를 진행 중입니다.";
    } else if (episodeId === 'airport') {
      scenarioContext = "현재 공항 입국 심사대(방문 목적 -> 체류 기간 -> 숙소 위치) 에피소드를 진행 중입니다.";
    } else if (episodeId === 'scrum') {
      scenarioContext = "현재 IT 데일리 스크럼(어제 한 일 -> 오늘 할 일 -> 이슈 사항) 에피소드를 진행 중입니다.";
    }

    // 🎯 2. 강력한 '협조 전용' 힌트 규칙 부여
    const systemPrompt = `당신은 실력 있는 영어 회화 튜터입니다.
${scenarioContext}

현재 사용자와 AI가 나누고 있는 대화 맥락을 파악하여, 사용자가 다음에 답변하기 가장 좋은 영어 문장 3가지를 추천해주세요.

🚨 중요 규칙:
1. 추천하는 문장은 반드시 "현재 상황극의 다음 목표로 원활하게 넘어가거나, AI의 질문에 협조적으로 대답하는 내용"이어야 합니다.
2. 대화를 종료하려 하거나, 상황극의 참여를 거절하는 힌트는 절대 제공하지 마세요. (예: "오늘 바빠", "영화 안 볼래" 등 금지)
3. 초보자도 쉽게 말할 수 있는 길이여야 하며, 각 답변은 뉘앙스나 선택지가 달라야 합니다. (예: 액션 영화 추천, 로맨스 영화 추천 등)

반드시 아래 JSON 형식으로 응답하세요:
{
  "hints": [
    {
      "type": "답변의 뉘앙스/의도 요약 (예: 액션 영화 선택)",
      "text": "추천하는 원어민 영어 문장",
      "translation": "한국어 해석"
    }
  ]
}`;

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedMessages
      ],
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(result);

  } catch (error) {
    console.error("Hint API Error:", error);
    return NextResponse.json({ error: "힌트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}