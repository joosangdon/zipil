"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, TrendingUp, Award, BarChart3 } from 'lucide-react';

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    nouns: 0,
    verbs: 0,
    adjectives: 0,
    others: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 내 단어장에서 품사(pos) 데이터만 전부 가져옵니다.
      const { data, error } = await supabase
        .from('vocab')
        .select('pos')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        // 가져온 데이터를 품사별로 분류하여 개수를 셉니다.
        const nouns = data.filter(w => w.pos === '명사').length;
        const verbs = data.filter(w => w.pos === '동사').length;
        const adjectives = data.filter(w => w.pos === '형용사').length;
        const others = data.length - nouns - verbs - adjectives;

        setStats({
          total: data.length,
          nouns,
          verbs,
          adjectives,
          others
        });
      }
    } catch (error) {
      console.error("통계 불러오기 에러:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-slate-500">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 md:py-12 px-4">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">학습 통계</h1>
        <p className="text-slate-500">지금까지 수집한 단어와 학습 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 상단 요약 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-700">총 수집 단어</h3>
          </div>
          <div className="text-4xl font-black text-slate-900">
            {stats.total}<span className="text-lg text-slate-500 font-medium ml-1">개</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-700">학습 진행도</h3>
          </div>
          <div className="text-4xl font-black text-slate-900">
            {stats.total > 0 ? 'Active' : 'Start'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-700">오늘의 한 마디</h3>
          </div>
          <div className="text-lg font-medium text-slate-700 mt-2">
            {stats.total > 0 
              ? "꾸준히 단어를 모아가고 계시네요! 훌륭합니다. 👏" 
              : "퀴즈를 풀고 단어장에 새로운 단어를 추가해 보세요!"}
          </div>
        </div>
      </div>

      {/* 하단 품사별 분포도 섹션 */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">품사별 단어 분포도</h2>
        </div>

        <div className="space-y-6">
          {/* 명사 바 */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-700">명사</span>
              <span className="text-slate-500">{stats.nouns}개</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-1000" 
                style={{ width: `${stats.total > 0 ? (stats.nouns / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* 동사 바 */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-700">동사</span>
              <span className="text-slate-500">{stats.verbs}개</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full transition-all duration-1000" 
                style={{ width: `${stats.total > 0 ? (stats.verbs / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* 형용사 바 */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-700">형용사</span>
              <span className="text-slate-500">{stats.adjectives}개</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div 
                className="bg-amber-500 h-4 rounded-full transition-all duration-1000" 
                style={{ width: `${stats.total > 0 ? (stats.adjectives / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* 기타 바 */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-700">기타 (부사, 전치사 등)</span>
              <span className="text-slate-500">{stats.others}개</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div 
                className="bg-violet-500 h-4 rounded-full transition-all duration-1000" 
                style={{ width: `${stats.total > 0 ? (stats.others / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}