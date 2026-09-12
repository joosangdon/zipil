"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 구글 로그인 (선택 사항 - 기존에 구현해두셨다면 유지)
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  // 🚨 새롭게 추가된 이메일/비밀번호 로그인 로직
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // 엔터 쳤을 때 새로고침 방지
    
    if (!email || !password) return alert("이메일과 비밀번호를 모두 입력해주세요.");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 에러 종류에 따른 친절한 알림
        if (error.message === "Invalid login credentials") {
          alert("이메일 또는 비밀번호가 일치하지 않습니다.");
        } else if (error.message === "Email not confirmed") {
          alert("이메일 인증이 완료되지 않은 계정입니다.");
        } else {
          alert("로그인 중 오류가 발생했습니다.");
        }
        throw error;
      }

      // 로그인 성공! 홈으로 이동
      router.push('/');
      router.refresh(); // 헤더 등 상태 업데이트를 위해 새로고침
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
        
        {/* 타이틀 영역 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-amber-500 mr-2">ㅈㅍ</span>
            <span className="text-slate-900">집필중 (Zipil)</span>
          </h1>
          <p className="text-sm text-slate-500">AI 영작 & 인터랙티브 발음 교정 워크스페이스</p>
        </div>

        {/* 구글 로그인 버튼 */}
        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm mb-6"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-slate-100 flex-1"></div>
          <span className="text-xs text-slate-400 font-medium">또는 이메일로 계속하기</span>
          <div className="h-px bg-slate-100 flex-1"></div>
        </div>

        {/* 🚨 이메일 로그인 폼 (form 태그로 감싸서 엔터키 로그인 지원) */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소" 
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-medium" 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호" 
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-medium" 
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
          </button>
        </form>

        {/* 하단 회원가입 이동 링크 */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <p className="text-sm text-slate-500">아직 계정이 없으신가요?</p>
          <Link 
            href="/signup" 
            className="flex items-center justify-center w-full py-3.5 bg-slate-50 text-slate-700 rounded-xl font-bold hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            이메일로 회원가입
          </Link>
        </div>
        
      </div>
    </main>
  );
}