"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, PenTool, Brain, Calendar, ChevronLeft, Activity, Flame, BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';

interface WordItem {
  word: string;
  meaning: string;
}

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalHistory: 0,
    totalVocab: 0,
    memorizedVocab: 0,
    activeDays: 0,
    currentStreak: 0, 
  });

  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number; isFuture: boolean; month: number }[]>([]);

  const [posDist, setPosDist] = useState({ noun: 0, verb: 0, adj: 0, etc: 0 });
  const [posWords, setPosWords] = useState({ 
    noun: [] as WordItem[], 
    verb: [] as WordItem[], 
    adj: [] as WordItem[], 
    etc: [] as WordItem[] 
  });
  
  const [expandedPos, setExpandedPos] = useState({
    noun: false, verb: false, adj: false, etc: false,
  });

  const togglePos = (pos: 'noun' | 'verb' | 'adj' | 'etc') => {
    setExpandedPos(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  const getFormattedDate = (dateString: string | Date) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayStr = getFormattedDate(today);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 👇 attendance 테이블도 함께 불러오도록 추가!
      const [historyRes, vocabRes, attendanceRes] = await Promise.all([
        supabase.from('history').select('created_at, date'),
        supabase.from('vocab').select('word, meaning, is_memorized, created_at, date, pos'),
        supabase.from('attendance').select('study_date') 
      ]);

      const historyData = historyRes.data || [];
      const vocabData = vocabRes.data || [];
      const attendanceData = attendanceRes.data || [];

      // 👇 3개 테이블의 날짜 데이터를 모두 하나로 합치기
      const allDates = [
        ...historyData.map(item => getFormattedDate(item.created_at || item.date)),
        ...vocabData.map(item => getFormattedDate(item.created_at || item.date)),
        ...attendanceData.map(item => getFormattedDate(item.study_date))
      ];
      const activityMap = new Map<string, number>();
      allDates.forEach(date => activityMap.set(date, (activityMap.get(date) || 0) + 1));

      const uniqueDays = activityMap.size;
      const memorizedCount = vocabData.filter(v => v.is_memorized).length;

      const nouns: WordItem[] = [];
      const verbs: WordItem[] = [];
      const adjs: WordItem[] = [];
      const etcs: WordItem[] = [];

      vocabData.forEach(v => {
        const item = { word: v.word, meaning: v.meaning || '' };
        if (!v.pos) etcs.push(item);
        else if (v.pos.includes('명사')) nouns.push(item);
        else if (v.pos.includes('동사')) verbs.push(item);
        else if (v.pos.includes('형용사')) adjs.push(item);
        else etcs.push(item);
      });

      setPosDist({ noun: nouns.length, verb: verbs.length, adj: adjs.length, etc: etcs.length });
      setPosWords({ noun: nouns, verb: verbs, adj: adjs, etc: etcs });

      const dayOfWeek = today.getDay(); 
      const monFirstDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
      
      const endOfGrid = new Date(today);
      endOfGrid.setDate(today.getDate() + (6 - monFirstDay));

      const DAYS_TO_SHOW = 84; 
      const heatmap = [];
      let currentStreakCount = 0;
      let streakBroken = false;

      for (let i = 0; i < DAYS_TO_SHOW; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const count = activityMap.get(getFormattedDate(d)) || 0;
        
        if (i === 0 || i === 1) { 
           if (count > 0 && !streakBroken) currentStreakCount++;
           else if (i === 1 && currentStreakCount === 0) streakBroken = true; 
        } else {
           if (count > 0 && !streakBroken) currentStreakCount++;
           else streakBroken = true;
        }
      }

      for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date(endOfGrid);
        d.setDate(endOfGrid.getDate() - i);
        const dateStr = getFormattedDate(d);
        const count = activityMap.get(dateStr) || 0;
        
        // 👇 시스템 시간이 꼬여도 절대 틀리지 않게 문자열 비교 방식으로 더 견고하게 수정
        const isFuture = dateStr > todayStr; 
        
        heatmap.push({ 
          date: dateStr, 
          count: isFuture ? 0 : count, 
          isFuture,
          month: d.getMonth() + 1 
        });
      }

      setHeatmapData(heatmap);
      setStats({
        totalHistory: historyData.length, totalVocab: vocabData.length,
        memorizedVocab: memorizedCount, activeDays: uniqueDays,
        currentStreak: currentStreakCount
      });

    } catch (error) {
      console.error('데이터 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const maxPos = Math.max(posDist.noun, posDist.verb, posDist.adj, posDist.etc, 1);

  const columns: { date: string; count: number; isFuture: boolean; month: number }[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    columns.push(heatmapData.slice(i, i + 7));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-800 p-4 md:p-8 lg:p-12 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">학습 통계 📊</h1>
            <p className="text-slate-500 font-medium text-sm">지금까지 수집한 데이터와 학습 현황을 한눈에 확인하세요.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <div className="p-2 bg-amber-50 rounded-xl"><PenTool className="w-5 h-5" /></div>
                <span className="font-bold text-sm">교정 문장</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.totalHistory}</span>
                <span className="text-sm text-slate-400 font-medium mb-1.5">문장</span>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-2 text-emerald-600 mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl"><BookOpen className="w-5 h-5" /></div>
                <span className="font-bold text-sm">수집 단어</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.totalVocab}</span>
                <span className="text-sm text-slate-400 font-medium mb-1.5">개</span>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-violet-300 transition-colors">
              <div className="flex items-center gap-2 text-violet-600 mb-4">
                <div className="p-2 bg-violet-50 rounded-xl"><Brain className="w-5 h-5" /></div>
                <span className="font-bold text-sm">암기 완료</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.memorizedVocab}</span>
                <span className="text-sm text-slate-400 font-medium mb-1.5">개</span>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <div className="p-2 bg-rose-50 rounded-xl"><Calendar className="w-5 h-5" /></div>
                  <span className="font-bold text-sm">총 출석일</span>
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.activeDays}</span>
                <span className="text-sm text-slate-400 font-medium mb-1.5">일</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
              <BarChart2 className="w-5 h-5 text-slate-700" />
              품사별 단어 분포도
            </h3>

            <div className="space-y-6">
              <div>
                <div onClick={() => togglePos('noun')} className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2 cursor-pointer hover:text-violet-600 transition-colors select-none group">
                  <span className="flex items-center gap-1.5">명사{expandedPos.noun ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-violet-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />}</span>
                  <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{posDist.noun}개</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(posDist.noun / maxPos) * 100}%` }}></div>
                </div>
                {expandedPos.noun && posWords.noun.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                    {posWords.noun.map((item, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 shadow-sm flex items-center gap-1.5">
                        <span className="font-bold">{item.word}</span><span className="text-blue-300">|</span><span className="font-medium text-blue-600">{item.meaning}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div onClick={() => togglePos('verb')} className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2 cursor-pointer hover:text-violet-600 transition-colors select-none group">
                  <span className="flex items-center gap-1.5">동사{expandedPos.verb ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-violet-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />}</span>
                  <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{posDist.verb}개</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(posDist.verb / maxPos) * 100}%` }}></div>
                </div>
                {expandedPos.verb && posWords.verb.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                    {posWords.verb.map((item, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100 shadow-sm flex items-center gap-1.5">
                        <span className="font-bold">{item.word}</span><span className="text-green-300">|</span><span className="font-medium text-green-600">{item.meaning}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div onClick={() => togglePos('adj')} className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2 cursor-pointer hover:text-violet-600 transition-colors select-none group">
                  <span className="flex items-center gap-1.5">형용사{expandedPos.adj ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-violet-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />}</span>
                  <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{posDist.adj}개</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(posDist.adj / maxPos) * 100}%` }}></div>
                </div>
                {expandedPos.adj && posWords.adj.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                    {posWords.adj.map((item, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs rounded-lg border border-orange-100 shadow-sm flex items-center gap-1.5">
                        <span className="font-bold">{item.word}</span><span className="text-orange-300">|</span><span className="font-medium text-orange-600">{item.meaning}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div onClick={() => togglePos('etc')} className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2 cursor-pointer hover:text-violet-600 transition-colors select-none group">
                  <span className="flex items-center gap-1.5">기타 (부사, 전치사 등){expandedPos.etc ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-violet-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />}</span>
                  <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{posDist.etc}개</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(posDist.etc / maxPos) * 100}%` }}></div>
                </div>
                {expandedPos.etc && posWords.etc.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                    {posWords.etc.map((item, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs rounded-lg border border-purple-100 shadow-sm flex items-center gap-1.5">
                        <span className="font-bold">{item.word}</span><span className="text-purple-300">|</span><span className="font-medium text-purple-600">{item.meaning}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-violet-600" />
                  나의 학습 잔디밭
                </h3>
                <p className="text-xs text-slate-500">최근 12주간의 학습 활동 기록입니다.</p>
              </div>

              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold border border-rose-100 shadow-sm">
                <Flame className={`w-5 h-5 ${stats.currentStreak > 0 ? "animate-pulse" : ""}`} />
                {stats.currentStreak > 0 ? `현재 ${stats.currentStreak}일 연속 학습 중!` : "오늘의 학습을 시작해보세요!"}
              </div>
            </div>

            <div className="w-full overflow-x-auto pb-4 pt-10 flex gap-2">
              
              {/* 👇 문제의 라벨 정렬 100% 수정 완료! (pt-6 삭제 및 중앙 정렬) */}
              <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-400 pr-2 items-center text-right w-6 shrink-0">
                <div className="h-4 leading-4 flex items-center justify-end w-full">월</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full">화</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full">수</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full">목</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full">금</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full">토</div>
                <div className="h-4 leading-4 flex items-center justify-end w-full text-rose-400">일</div>
              </div>

              <div className="flex gap-1.5">
                {columns.map((col, cIdx) => {
                  const showMonth = cIdx === 0 || col[0].month !== columns[cIdx - 1][0].month;

                  return (
                    <div key={cIdx} className="flex flex-col gap-1.5 relative">
                      {showMonth && (
                        <span className="absolute -top-6 left-0 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {col[0].month}월
                        </span>
                      )}
                      
                      {col.map((day, rIdx) => {
                        if (day.isFuture) {
                          return <div key={rIdx} className="w-4 h-4 rounded-sm bg-slate-50 border border-slate-100 opacity-50" />;
                        }

                        let colorClass = "bg-slate-100 border border-slate-200/50"; 
                        if (day.count > 0 && day.count <= 2) colorClass = "bg-violet-200"; 
                        else if (day.count > 2 && day.count <= 5) colorClass = "bg-violet-400"; 
                        else if (day.count > 5) colorClass = "bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]"; 

                        const isToday = day.date === todayStr;
                        const todayClass = isToday ? "ring-2 ring-emerald-400 ring-offset-1 z-10" : "";

                        return (
                          <div key={rIdx} className="relative group flex items-center justify-center w-4 h-4">
                            <div 
                              className={`w-full h-full rounded-sm transition-all group-hover:ring-2 group-hover:ring-slate-400 group-hover:scale-125 cursor-help ${colorClass} ${todayClass}`}
                            />
                            
                            {/* 예쁜 말풍선(Tooltip) 디자인 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.1)] rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none">
                              <span className="font-bold text-violet-600">{day.date}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-bold text-slate-700">{day.count}건 학습</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-white ring-2 ring-emerald-400 ring-offset-1"></div>
                <span>오늘 (Today)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200/50"></div>
                <div className="w-3 h-3 rounded-sm bg-violet-200"></div>
                <div className="w-3 h-3 rounded-sm bg-violet-400"></div>
                <div className="w-3 h-3 rounded-sm bg-violet-600"></div>
                <span>More</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}