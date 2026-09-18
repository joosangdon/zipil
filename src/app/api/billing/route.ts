import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { authKey, customerKey } = await req.json();

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: '서버에 시크릿 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 시크릿 키를 Base64로 인코딩 (토스페이먼츠 API 인증 방식)
    const encryptedSecretKey = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // 토스페이먼츠 빌링키 발급 API 호출
    const tossResponse = await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${authKey}`, {
      method: 'POST',
      headers: {
        Authorization: encryptedSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerKey }),
    });

    const data = await tossResponse.json();

    if (!tossResponse.ok) {
      return NextResponse.json({ error: data.message || '빌링키 발급 실패' }, { status: tossResponse.status });
    }

    // 성공 시 발급받은 billingKey 반환
    return NextResponse.json({ 
      success: true, 
      billingKey: data.billingKey,
      customerKey: data.customerKey,
      cardCompany: data.cardCompany,
      cardNumber: data.cardNumber
    });

  } catch (error) {
    console.error('빌링키 API 에러:', error);
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}