import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1. 관리자(서버) 권한으로 DB 연결 (RLS 보안 정책을 우회하기 위함)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // 서비스 롤 키가 없다면 임시로 익명 키 사용 (실무에서는 반드시 Service Role Key 사용)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. 결제 예정일이 '오늘'이거나 '과거'인 활성(ACTIVE) 구독자 검색
    const now = new Date().toISOString();
    const { data: dueSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('next_billing_date', now);

    if (fetchError) throw fetchError;
    
    // 결제할 사람이 없으면 쿨하게 종료
    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      return NextResponse.json({ message: '오늘 결제가 예정된 유저가 없습니다.' });
    }

    const results = [];
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encryptedSecretKey = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // 3. 결제 대상자들을 순회하며 토스에 실제 출금 요청
    for (const sub of dueSubscriptions) {
      // 주문번호는 무조건 겹치지 않게 고유해야 함 (유저ID + 현재시간)
      const orderId = `order_${sub.user_id.substring(0, 8)}_${Date.now()}`; 

      const tossResponse = await fetch(`https://api.tosspayments.com/v1/billing/${sub.billing_key}`, {
        method: 'POST',
        headers: {
          Authorization: encryptedSecretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerKey: sub.user_id,
          amount: 9900, // 💸 실제 결제할 금액 (9,900원)
          orderId: orderId,
          orderName: 'Zipil PRO 1개월 구독',
        }),
      });

      const tossData = await tossResponse.json();

      if (tossResponse.ok) {
        // ✅ 결제 성공: 다음 결제일을 1개월 뒤로 연장
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .update({ next_billing_date: nextDate.toISOString() })
          .eq('id', sub.id);
        
        results.push({ user: sub.user_id, status: 'SUCCESS' });
      } else {
        // ❌ 결제 실패 (잔액 부족, 한도 초과 등): 상태를 FAILED로 변경
        await supabase
          .from('subscriptions')
          .update({ status: 'FAILED' })
          .eq('id', sub.id);
          
        results.push({ user: sub.user_id, status: 'FAIL', reason: tossData.message });
      }
    }

    return NextResponse.json({ success: true, processed: results });

  } catch (error) {
    console.error('자동 결제 에러:', error);
    return NextResponse.json({ error: '자동 결제 프로세스 중 오류 발생' }, { status: 500 });
  }
}
// src/app/api/billing/pay/route.ts 파일 맨 아래에 추가
export async function GET(req: Request) {
  return POST(req);
}