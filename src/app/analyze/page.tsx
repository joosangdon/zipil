"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, List, Loader2, BookOpen, Bookmark, CheckCircle2, Lock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AnalyzePage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [summaryLength, setSummaryLength] = useState<3 | 5 | 10>(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'translation'>('summary');

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProUser, setIsProUser] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // 💡 결제 모달창(팝업)을 띄우기 위한 상태 추가
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  useEffect(() => {
    const checkProStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("로그인이 필요합니다.");
        router.push('/login');
        return;
      }

      setSessionToken(session.access_token);

      const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com'];
      let hasProAccess = ADMIN_EMAILS.includes(session.user.email || '');

      if (!hasProAccess) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (subData && subData.status === 'ACTIVE') {
          hasProAccess = true;
        }
      }

      setIsProUser(hasProAccess);
      setIsAuthLoading(false);
    };

    checkProStatus();
  }, [router]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    setViewMode('summary'); 

    try {
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}` 
        },
        body: JSON.stringify({ text: inputText, summaryLength }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "분석 중 오류가 발생했습니다.");
      }

      setResult({ ...data, analyzedLength: summaryLength });
      toast.success("AI 문서 분석이 완료되었습니다!");
    } catch (error: any) {
      toast.error(error.message || "서버와 통신할 수 없습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAllWords = async () => {
    if (!result || !result.words) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingWords } = await supabase.from('vocab').select('word').eq('user_id', user.id);
      const existingWordSet = new Set((existingWords || []).map(row => row.word));
      const today = new Date().toISOString().split('T')[0];
      
      const wordsToInsert = result.words
        .filter((w: any) => !existingWordSet.has(w.word))
        .map((w: any) => ({
          user_id: user.id, word: w.word, meaning: w.meaning, pos: w.pos || '단어', date: today
        }));

      if (wordsToInsert.length === 0) {
        toast.error("추출된 모든 단어가 이미 단어장에 있습니다.");
        return;
      }

      const { error } = await supabase.from('vocab').insert(wordsToInsert);
      if (error) throw error;
      toast.success(`새로운 단어 ${wordsToInsert.length}개가 단어장에 저장되었습니다! 📚`);
      
    } catch (err: any) {
      toast.error("저장에 실패했습니다.");
    }
  };

  const handleSaveSingleWord = async (w: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase.from('vocab').select('id').eq('user_id', user.id).eq('word', w.word).maybeSingle();
      if (existing) {
        toast.error(`'${w.word}'은(는) 이미 단어장에 있습니다.`);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('vocab').insert([{
        user_id: user.id, word: w.word, meaning: w.meaning, pos: w.pos || '단어', date: today
      }]);

      if (error) throw error;
      toast.success(`'${w.word}' 단어장에 저장 완료! 📚`);
    } catch (err: any) {
      toast.error("저장에 실패했습니다.");
    }
  };

  // 💡 결제 모달(Paywall) 컴포넌트 렌더링 함수
  const renderPaywallModal = () => {
    if (!showPaywallModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
          <button 
            onClick={() => setShowPaywallModal(false)}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-8 pt-10 flex flex-col items-center bg-gradient-to-b from-violet-50 to-white">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-500 mb-2">Zipil PRO</h2>
            <p className="text-sm font-bold text-slate-500 mb-8">더 강력한 AI 기능으로 영작 마스터가 되세요</p>

            <div className="w-full space-y-3 mb-8">
              {[
                { icon: "✨", text: "하루 5회 제한 없는 무제한 AI 영작 교정" },
                { icon: "🧠", text: "내 약점을 파고드는 AI 맞춤형 심화 퀴즈" },
                { icon: "🎙️", text: "원어민 수준의 정밀 발음 분석 및 피드백" },
                { icon: "📊", text: "긴 영어 논문과 아티클 무제한 AI 문서 분석" }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <span className="text-lg">{feature.icon}</span>
                  <span className="text-sm font-bold text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="text-center mb-6">
              <span className="text-3xl font-black text-slate-900">₩9,900</span>
              <span className="text-slate-500 font-bold ml-1">/ 월</span>
            </div>

            <button 
              onClick={() => {
                toast.error("테스트 환경에서는 결제가 진행되지 않습니다.");
                setShowPaywallModal(false);
              }}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/30 transition-all active:scale-95"
            >
              PRO 플랜 7일 무료 체험하기
            </button>
            <p className="text-[10px] text-slate-400 font-medium mt-4">언제든지 취소할 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#FAF9F6] flex justify-center items-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] p-4 md:p-8 lg:p-12 relative">
      <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
        
        <div className="mb-10 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">AI 문서 분석</h1>
              <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-md tracking-wider shadow-sm">PRO</span>
            </div>
            <p className="text-slate-500 font-medium text-sm md:text-base">영어 논문이나 아티클을 넣으면 요약, 번역, 핵심 단어를 추출해 드립니다.</p>
          </div>
        </div>

        {!isProUser ? (
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[500px]">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">PRO 멤버십 전용 기능입니다</h2>
            
            {/* 💡 텍스트 너비를 살짝 넓히고(max-w-lg), break-keep 적용 및 명시적 줄바꿈 추가 */}
            <p className="text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed font-medium text-base break-keep">
              긴 영어 논문과 아티클을 순식간에 분석하고, 핵심 고급 어휘만 골라<br/>
              내 단어장에 저장하는 강력한 AI 분석기를 무제한으로 사용해 보세요.
            </p>
            
            {/* 💡 링크 이동 대신 모달창 상태를 켜는 버튼으로 변경 */}
            <button 
              onClick={() => setShowPaywallModal(true)}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md cursor-pointer"
            >
              PRO 멤버십 업그레이드 하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[750px]">
            {/* 왼쪽: 원문 입력 영역 */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>영어 원문 입력</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${inputText.length > 3000 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                  {inputText.length} / 3,000자
                </span>
              </div>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="여기에 분석할 영어 텍스트(초록, 기사 등)를 붙여넣으세요. 최대 3,000자까지 지원됩니다."
                className="w-full flex-1 p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 text-slate-700 leading-relaxed transition-colors mb-6 text-sm md:text-base"
              />

              <div className="mb-6 shrink-0">
                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-600">
                  <List className="w-4 h-4" />
                  <span>요약 뎁스(Depth) 설정</span>
                </div>
                <div className="flex gap-3">
                  {[3, 5, 10].map((length) => (
                    <button
                      key={length}
                      onClick={() => setSummaryLength(length as 3 | 5 | 10)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 cursor-pointer ${
                        summaryLength === length
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {length}줄 요약
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !inputText.trim() || inputText.length > 3000}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> AI가 문서를 분석하고 있습니다...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> 분석 시작하기</>
                )}
              </button>
            </div>

            {/* 오른쪽: 결과 출력 영역 */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden relative">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50 rounded-2xl border-2 border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-center leading-relaxed">
                    원문을 입력하고 분석을 시작하면<br/>여기에 요약과 핵심 단어가 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 shrink-0">
                    <button
                      onClick={() => setViewMode('summary')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      핵심 요약 & 단어
                    </button>
                    <button
                      onClick={() => setViewMode('translation')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'translation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      전체 번역본 보기
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {viewMode === 'summary' ? (
                      <div>
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-extrabold text-slate-900">
                              핵심 {result.analyzedLength}줄 요약 
                            </h2>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-slate-800 leading-loose text-[15px] font-medium shadow-sm">
                            {result.summary}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              <h2 className="text-lg font-extrabold text-slate-900">핵심 영단어 추출</h2>
                            </div>
                            <button 
                              onClick={handleSaveAllWords}
                              className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
                            >
                              <Bookmark className="w-3.5 h-3.5" /> 전체 단어장 저장
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {result.words.map((w: any, idx: number) => (
                              <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-1 hover:border-indigo-300 transition-colors group">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-lg">{w.word}</span>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{w.pos}</span>
                                  </div>
                                  <button 
                                    onClick={() => handleSaveSingleWord(w)} 
                                    className="text-slate-300 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                                    title="이 단어만 저장"
                                  >
                                    <Bookmark className="w-4 h-4" />
                                  </button>
                                </div>
                                <span className="text-sm font-medium text-slate-600">{w.meaning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 leading-loose text-[15px]">
                        {result.translation.split('\n').map((paragraph: string, i: number) => (
                          <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* 💡 최하단에 결제 모달 렌더링 호출 */}
      {renderPaywallModal()}
      
    </main>
  );
}