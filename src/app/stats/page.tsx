"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// 👇 아코디언 열기/닫기용 화살표 아이콘(ChevronDown) 추가
import { BookOpen, TrendingUp, Award, BarChart3, ChevronDown } from 'lucide-react';

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  // 👇 1. DB에서 가져온 전체 단어 리스트를 저장할 상태 추가
  const [vocabList, setVocabList] = useState<any[]>([]);
  // 👇 2. 어떤 품사 아코디언이 열려있는지 추적하는 상태 추가
  const [expandedPos, setExpandedPos] = useState<string | null>(null);
  
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

      // 👇 3. 품사뿐만 아니라 id, 단어(word), 뜻(meaning)도 함께 가져오도록 수정
      const { data, error } = await supabase
        .from('vocab')
        .select('id, word, meaning, pos')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setVocabList(data); // 가져온 전체 데이터를 저장 (아코디언에서 쓰기 위함)

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

  // 👇 4. 반복문(map)으로 렌더링하기 위해 배열로 묶어줍니다
  const posCategories = [
    { id: '명사', label: '명사', count: stats.nouns, barColor: 'bg-blue-500', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: '동사', label: '동사', count: stats.verbs, barColor: 'bg-green-500', badgeColor: 'bg-green-50 text-green-700 border-green-200' },
    { id: '형용사', label: '형용사', count: stats.adjectives, barColor: 'bg-amber-500', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: '기타', label: '기타 (부사, 전치사 등)', count: stats.others, barColor: 'bg-violet-500', badgeColor: 'bg-violet-50 text-violet-700 border-violet-200' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-8 md:py-12 px-4">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">학습 통계</h1>
        <p className="text-slate-500">지금까지 수집한 단어와 학습 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 상단 요약 카드 섹션 (기존과 동일) */}
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

      {/* 👇 하단 품사별 분포도 섹션 (아코디언 적용) */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">품사별 단어 분포도</h2>
        </div>

        <div className="space-y-6">
          {posCategories.map((stat) => {
            // 해당 품사에 속하는 단어들만 필터링
            const wordsInPos = vocabList.filter(v => 
              stat.id === '기타' 
                ? !['명사', '동사', '형용사'].includes(v.pos)
                : v.pos === stat.id
            );
            
            const isExpanded = expandedPos === stat.id;
            const maxCount = stats.total || 1; // 0으로 나누기 방지

            return (
              <div key={stat.id} className="relative group">
                
                {/* 막대그래프 영역 (클릭 가능) */}
                <div 
                  onClick={() => stat.count > 0 && setExpandedPos(isExpanded ? null : stat.id)}
                  className={`cursor-pointer transition-all duration-200 ${stat.count > 0 ? "hover:opacity-80" : "opacity-50 cursor-not-allowed"}`}
                >
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5 transition-colors group-hover:text-slate-900">
                      {stat.label}
                      {/* 단어가 1개 이상일 때만 화살표 아이콘 표시 */}
                      {stat.count > 0 && (
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
                      )}
                    </span>
                    <span className="text-slate-500">{stat.count}개</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${stat.barColor} transition-all duration-1000 ease-out`}
                      style={{ width: `${(stat.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 아코디언 패널 (클릭하면 스르륵 열리는 영역) */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  {/* 스크롤이 생길 경우를 대비해 max-h-[300px]와 overflow-y-auto 적용 */}
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100/80 shadow-inner max-h-[300px] overflow-y-auto">
                    {wordsInPos.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shadow-sm ${stat.badgeColor} transform transition-transform hover:-translate-y-0.5 cursor-default`}
                      >
                        <span className="font-bold">{item.word}</span>
                        <span className="opacity-60">|</span>
                        <span className="font-medium opacity-80">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}