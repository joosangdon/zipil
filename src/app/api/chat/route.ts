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

    let scenarioContext = "";
    if (episodeId === 'movie') {
      scenarioContext = "상황: 당신은 사용자의 친한 외국인 친구입니다. 주말 영화관람을 위해 [1.영화 장르 고르기 -> 2.팝콘 주문하기 -> 3.좌석 예매하기] 순서로 대화를 이끌어가야 합니다. 캐주얼한 톤으로 대화하세요.";
    } else if (episodeId === 'airport') {
      scenarioContext = "상황: 당신은 엄격한 공항 입국 심사관입니다. [1.방문 목적 -> 2.체류 기간 -> 3.숙소 위치]를 순서대로 질문하세요. 딱딱하고 사무적인 톤을 유지하세요.";
    } else if (episodeId === 'scrum') {
      scenarioContext = "상황: 당신은 IT 회사의 스크럼 마스터입니다. 데일리 스크럼에서 [1.어제 한 일 -> 2.오늘 할 일 -> 3.이슈 사항]을 순서대로 질문하세요. 프로페셔널한 비즈니스 톤으로 대화하세요.";
    }

    const systemPrompt = `당신은 원어민 영어 회화 파트너입니다.
${scenarioContext}

🚨 중요 규칙:
1. 사용자가 대화 주제를 벗어나려 하거나 거절하더라도, 절대 다른 주제로 빠지지 말고 가볍게 반응한 뒤 "다시 본래의 상황극 목표"로 대화를 적극적으로 유도하세요.
2. 답변은 실제 대화처럼 1~2문장으로 짧고 간결하게 하세요.
3. [미션 판단 ⭐️]: 대화 내역을 분석하여, 부여된 3가지 목표(예: 1.장르 -> 2.팝콘 -> 3.좌석)에 대해 사용자가 모두 적절히 답변했는지 엄격히 평가하세요.
4. 만약 사용자가 마지막 목표(예: 좌석 예매)까지 대답을 마쳤다면, 당신의 답변에 마무리 인사(예: "Awesome, can't wait!")를 적고 반드시 "isCompleted" 값을 true 로 반환하세요. 아직 진행 중이라면 false 입니다.
5. 반드시 아래 JSON 형식으로 응답하세요:
{
  "text": "당신의 영어 답변",
  "translation": "해당 영어 답변에 대한 자연스러운 한국어 해석",
  "isCompleted": true 또는 false (boolean)
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
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "대화 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}