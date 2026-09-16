"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Loader2, Sparkles, Mic, PenTool, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 이메일 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error("이메일과 비밀번호를 모두 입력해주세요.");
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error("이메일 또는 비밀번호가 일치하지 않습니다.");
        }
        throw error;
      }

      toast.success("환영합니다! 🎉");
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 구글 소셜 로그인 처리
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
    } catch (err) {
      toast.error("구글 로그인 연동 중 오류가 발생했습니다.");
    }
  };

  return (
    <main className="min-h-screen w-full flex bg-white">
      
      {/* 🚀 왼쪽 영역: 브랜딩 및 미니 랜딩 (모바일에서는 숨김, lg 사이즈 이상에서만 절반 차지) */}
      <div className="hidden lg:flex flex-col justify-between lg:w-3/5 bg-slate-900 p-12 xl:p-24 relative overflow-hidden">
        {/* 배경 화려한 그라데이션 조명 효과 */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" />

        {/* 제안 3: 모던 미니멀 인디케이터 (토스 스타일 심플함) */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
            <span className="font-black text-white text-base tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              ㅈㅍㅈ
            </span>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">집필중</span>
        </div>

        {/* 메인 카피 및 플로팅 장식 영역 */}
        <div className="relative z-10 mt-12 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
            AI와 함께하는 <br />가장 완벽한 영작 튜터링.
          </h1>
          <p className="text-lg text-slate-400 font-medium mb-12 max-w-md leading-relaxed">
            단순한 번역을 넘어 문맥에 맞는 뉘앙스 교정과 원어민 수준의 정밀한 발음 피드백까지 한 번에 경험하세요.
          </p>

          {/* 공중에 떠 있는 듯한 기능 뱃지들 */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-max transform hover:-translate-y-1 transition-transform cursor-default">
              <div className="p-2 bg-violet-500/20 rounded-lg"><Sparkles className="w-5 h-5 text-violet-300" /></div>
              <div>
                <p className="text-white font-bold text-sm">무제한 AI 문장 교정</p>
                <p className="text-slate-400 text-xs">문법과 뉘앙스를 완벽하게</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-max ml-8 transform hover:-translate-y-1 transition-transform cursor-default">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><Mic className="w-5 h-5 text-emerald-300" /></div>
              <div>
                <p className="text-white font-bold text-sm">실전 발음 트레이닝</p>
                <p className="text-slate-400 text-xs">내 발음을 원어민과 비교 분석</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-max transform hover:-translate-y-1 transition-transform cursor-default">
              <div className="p-2 bg-rose-500/20 rounded-lg"><BrainCircuit className="w-5 h-5 text-rose-300" /></div>
              <div>
                <p className="text-white font-bold text-sm">오답 기반 맞춤 퀴즈</p>
                <p className="text-slate-400 text-xs">틀렸던 단어만 쏙쏙 골라 복습</p>
              </div>
            </div>
          </div>
        </div>

        {/* 카피라이트 */}
        <p className="relative z-10 text-xs text-slate-500 font-medium">
          © 2026 Zipil Workspace. All rights reserved.
        </p>
      </div>

      {/* 🚀 오른쪽 영역: 로그인 폼 */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 bg-[#FAF9F6] relative">
        {/* 모바일에서만 보이는 미니 로고 (데스크탑에선 숨김) */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
            <span className="font-bold text-amber-800 text-sm tracking-wider">ㅈㅍㅈ</span>
          </div>
          <span className="font-bold text-slate-900 tracking-tight">집필중</span>
        </div>

        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">환영합니다! 👋</h2>
            <p className="text-sm text-slate-500 font-medium">
              집필중에 다시 오신 것을 환영합니다. <br className="hidden sm:block" />로그인하고 학습을 이어나가세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="이메일 주소" 
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-shadow" 
                required 
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="비밀번호" 
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-shadow" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>로그인 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="relative flex items-center py-8">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
            onClick={handleGoogleLogin} 
            className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-3 shadow-sm mb-8"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Google 계정으로 계속하기
          </button>

          <p className="text-center text-sm text-slate-500 font-medium">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="text-violet-600 font-bold hover:text-violet-700 hover:underline underline-offset-4 transition-all">
              무료로 회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}