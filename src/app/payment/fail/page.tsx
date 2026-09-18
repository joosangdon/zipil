"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function PaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 토스페이먼츠가 URL 파라미터로 보내준 에러 메시지와 코드를 가져옵니다.
  const message = searchParams.get('message') || '결제 처리에 실패했습니다.';
  const code = searchParams.get('code') || 'UNKNOWN_ERROR';

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">카드 등록 실패</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{message}</p>
        
        <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg w-full mb-8 break-all">
          에러 코드: {code}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </main>
  );
}