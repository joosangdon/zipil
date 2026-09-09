"use client"; // 버튼 클릭 등 상호작용을 위해 클라이언트 컴포넌트로 선언

import React from 'react';
import { Mail, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (어제 세팅한 환경 변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
  
  // 🚀 구글 로그인 실행 함수
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 로그인 성공 후 돌아올 원래 주소 (현재 주소의 기본 도메인, 예: localhost:3000)
        redirectTo: `${window.location.origin}`, 
      },
    });

    if (error) {
      console.error('구글 로그인 에러:', error.message);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            <span className="text-amber-500 mr-2">ㅈㅍ</span>
            집필중 (Zipil)
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            AI 영작 & 인터랙티브 발음 교정 워크스페이스
          </p>
        </div>

        {/* 👇 여기에 onClick 이벤트를 달아주었습니다! */}
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl p-3 text-slate-700 font-medium hover:bg-slate-50 transition-colors mb-6 shadow-sm"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-sm text-slate-400 absolute">또는 이메일로 계속하기</span>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="email" 
              placeholder="이메일 주소" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="password" 
              placeholder="비밀번호" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl p-3 transition-colors shadow-sm">
            로그인
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          아직 계정이 없으신가요?{' '}
          <button className="text-indigo-600 font-semibold hover:underline">
            이메일로 회원가입
          </button>
        </div>
      </div>
    </div>
  );
}