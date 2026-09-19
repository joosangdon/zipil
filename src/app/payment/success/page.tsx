"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState("결제 정보를 안전하게 처리하고 있습니다...");
  
  // 👇 중복 호출 방지를 위한 useRef 추가
  const hasProcessed = useRef(false);

  const authKey = searchParams.get('authKey');
  const customerKey = searchParams.get('customerKey');

  useEffect(() => {
    const processBilling = async () => {
      // 👇 이미 처리된 요청이면 즉시 종료
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      if (!authKey || !customerKey) {
        toast.error("잘못된 접근입니다.");
        router.push('/');
        return;
      }

      try {
        const res = await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || '빌링키 발급 중 오류 발생');

        const { billingKey, cardCompany, cardNumber } = result;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("로그인 정보를 찾을 수 없습니다.");

        // 7일 뒤 날짜 계산
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 7);

        const { error: dbError } = await supabase.from('subscriptions').upsert([
          {
            user_id: user.id,
            billing_key: billingKey,
            card_company: cardCompany,
            card_number: cardNumber,
            status: 'ACTIVE',
            next_billing_date: nextBillingDate.toISOString(),
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'user_id' });

        if (dbError) throw dbError;

        setStatusText("PRO 구독이 성공적으로 완료되었습니다! 🎉");
        toast.success("Zipil PRO 멤버십이 시작되었습니다!");

        setTimeout(() => {
          router.push('/');
        }, 2500);

      } catch (err: any) {
        console.error("결제 승인 처리 에러:", err);
        toast.error(err.message || "결제 처리에 실패했습니다.");
        setTimeout(() => router.push('/'), 3000);
      }
    };

    processBilling();
  }, [authKey, customerKey, router]);

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">구독 처리 중</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{statusText}</p>
        <div className="mt-8">
          <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
        </div>
      </div>
    </main>
  );
}