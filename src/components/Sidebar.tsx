"use client"; // 접힘/펼침 상태 관리를 위해 클라이언트 컴포넌트로 선언

import React, { useState } from 'react';
import { Home, Gamepad2, BarChart2, ChevronLeft } from 'lucide-react';

export default function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <aside 
      className={`relative bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-50 shadow-xl shrink-0 h-full ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* 토글 버튼 */}
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-3 top-8 bg-slate-800 text-white rounded-full p-1 border border-slate-700 hover:bg-slate-700 shadow-md cursor-pointer transition-transform z-50"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`} />
      </button>

      {/* 로고 영역 */}
      <div className="h-20 flex items-center justify-center border-b border-slate-800">
        {isSidebarCollapsed ? (
          <span className="font-black text-amber-500 text-xl tracking-tighter">ㅈㅍ</span>
        ) : (
          <span className="font-bold text-white text-lg tracking-wide flex items-center gap-2">
            <span className="text-amber-500 font-black">ㅈㅍㅈ</span> 집필중
          </span>
        )}
      </div>

      {/* 메뉴 리스트 */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        <button className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/80 text-amber-400 transition-colors cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""}`}>
          <Home className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">홈 (교정)</span>}
        </button>

        <button className={`flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white transition-colors cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""}`}>
          <Gamepad2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">단어 퀴즈</span>}
        </button>

        <button className={`flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white transition-colors cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""}`}>
          <BarChart2 className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">학습 통계</span>}
        </button>
      </nav>
    </aside>
  );
}