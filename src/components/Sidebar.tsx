"use client";

import React, { useState, useEffect } from 'react';
import { Home, Gamepad2, BarChart2, ChevronLeft, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // useRouter 제거 (안 쓰임)
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const pathname = usePathname();
  
  // 👇 1. 초기값을 undefined로 두어, 정보를 가져오기 전 찰나의 순간에 오작동하는 것을 방지
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 탭을 이동할 때마다 사이드바 닫기
  useEffect(() => {
    setIsSidebarCollapsed(true);
  }, [pathname]);

  // 👇 2. 비회원이 보호된 메뉴를 눌렀을 때 가로채는 가드 함수
  const handleRestrictedClick = (e: React.MouseEvent, menuName: string) => {
    // 확실하게 '비회원(null)'인 상태로 판별되었을 때만 페이지 이동을 막음
    if (user === null) {
      e.preventDefault(); 
      toast.error(`'${menuName}' 기능은 로그인 후 이용할 수 있습니다.\n3초 만에 가입하고 모든 기능을 누려보세요!`, {
        duration: 4000,
      });
    }
  };

  if (pathname === '/login' || pathname === '/signup') return null;

  return (
    <aside 
      className={`relative bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-50 shadow-xl shrink-0 h-full ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-3 top-8 bg-slate-800 text-white rounded-full p-1 border border-slate-700 hover:bg-slate-700 shadow-md cursor-pointer transition-transform z-50"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`} />
      </button>

      <div className="h-20 flex items-center justify-center border-b border-slate-800">
        {isSidebarCollapsed ? (
          <span className="font-black text-amber-500 text-base tracking-tighter whitespace-nowrap">ㅈㅍㅈ</span>
        ) : (
          <span className="font-bold text-white text-lg tracking-wide flex items-center gap-2">
            <span className="text-amber-500 font-black">ㅈㅍㅈ</span> 집필중
          </span>
        )}
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {/* 홈은 누구나 접근 가능 */}
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <Home className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">홈 (교정)</span>}
        </Link>

        {/* 퀴즈 페이지 (로그인 필수) */}
        <Link 
          href="/quiz" 
          onClick={(e) => handleRestrictedClick(e, '단어 퀴즈')}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/quiz' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <Gamepad2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">단어 퀴즈</span>}
        </Link>

        {/* 학습 통계 페이지 (로그인 필수) */}
        <Link 
          href="/stats" 
          onClick={(e) => handleRestrictedClick(e, '학습 통계')}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/stats' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <BarChart2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">학습 통계</span>}
        </Link>
        {/* AI 문서 분석 (로그인 필수) */}
        <Link 
          href="/analyze" 
          onClick={(e) => handleRestrictedClick(e, 'AI 문서 분석')}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/analyze' 
              ? "bg-slate-800/80 text-indigo-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className={`w-5 h-5 shrink-0 ${pathname === '/analyze' ? 'text-indigo-400' : 'text-slate-400'}`} />
            {/* PRO 뱃지 (사이드바가 열려있을 때만 표시) */}
            {!isSidebarCollapsed && (
              <span className="absolute -top-1.5 -right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between w-full">
              <span className="text-sm whitespace-nowrap">AI 문서 분석</span>
              <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-2">PRO</span>
            </div>
          )}
        </Link>
        {/* 마이페이지 (로그인 필수) */}
        <Link 
          href="/mypage" 
          onClick={(e) => handleRestrictedClick(e, '마이페이지')}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/mypage' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <User className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">마이페이지</span>}
        </Link>
      </nav>
    </aside>
  );
}