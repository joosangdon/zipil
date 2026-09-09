"use client";

import React, { useState } from 'react';
import { Home, Gamepad2, BarChart2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 현재 주소를 알아내는 훅

export default function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname(); // 현재 URL 경로를 가져옵니다 (예: '/' 또는 '/quiz')

  if (pathname === '/login') return null; 

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
          <span className="font-black text-amber-500 text-xl tracking-tighter">ㅈㅍ</span>
        ) : (
          <span className="font-bold text-white text-lg tracking-wide flex items-center gap-2">
            <span className="text-amber-500 font-black">ㅈㅍㅈ</span> 집필중
          </span>
        )}
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {/* 버튼(button) 대신 링크(Link) 사용. 현재 경로(pathname)에 따라 색상이 바뀝니다. */}
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

        <Link 
          href="/quiz" 
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/quiz' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <Gamepad2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">단어 퀴즈</span>}
        </Link>

        {/* 통계 페이지는 아직 안 만들었으므로 href를 "#"으로 임시 처리 */}
        <Link 
          href="#" 
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
            pathname === '/stats' 
              ? "bg-slate-800/80 text-amber-400 font-semibold" 
              : "hover:bg-slate-800/50 hover:text-white text-slate-400 font-medium"
          } ${isSidebarCollapsed ? "justify-center" : ""}`}
        >
          <BarChart2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">학습 통계</span>}
        </Link>
      </nav>
    </aside>
  );
}