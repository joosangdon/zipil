import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// 서버에서 토큰을 검증하기 위한 Supabase 클라이언트 세팅
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 💡 1. 요청 헤더에서 신분증(토큰) 꺼내기
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // 💡 2. 토큰이 진짜인지 위조인지 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "유효하지 않은 로그인입니다." }, { status: 401 });
    }

    // 💡 3. 해당 유저가 PRO 권한(결제 유저 or 관리자)이 있는지 백엔드에서 다시 한번 확인!
    const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com'];
    let isPro = ADMIN_EMAILS.includes(user.email || '');

    if (!isPro) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sub?.status === 'ACTIVE') {
        isPro = true;
      }
    }

    // PRO가 아니면 여기서 가차 없이 쳐냄 (API 호출 방어)
    if (!isPro) {
      return NextResponse.json({ error: "PRO 멤버십 전용 기능입니다." }, { status: 403 });
    }

    // --- 여기까지 무사히 통과했다면 정상적인 AI 분석 로직 실행 ---

    const { text, summaryLength } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "분석할 문서를 입력해주세요." }, { status: 400 });
    }
    if (text.length > 3000) {
      return NextResponse.json({ error: "텍스트가 3,000자를 초과했습니다." }, { status: 400 });
    }

    const allowedLengths = [3, 5, 10];
    const targetLength = allowedLengths.includes(summaryLength) ? summaryLength : 3;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert English-Korean translator and English teacher. 
          Analyze the provided English text and return a JSON object exactly matching this structure:
          {
            "summary": "Provide exactly ${targetLength} sentences summarizing the core content in natural Korean.",
            "translation": "Provide the full Korean translation of the provided text.",
            "words": [
              {"word": "english word 1", "meaning": "Korean meaning", "pos": "part of speech (e.g., 명사, 동사)"},
              {"word": "english word 2", "meaning": "Korean meaning", "pos": "part of speech"},
              ... (Extract exactly 5 difficult/advanced English words from the text)
            ]
          }`
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
    console.error("Document Analysis Error:", error);
    return NextResponse.json(
      { error: "문서 분석 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}