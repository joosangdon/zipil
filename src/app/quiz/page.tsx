"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// 👇 1. 대시보드와 모달에 필요한 아이콘 대거 추가
import { Play, Bookmark, RotateCcw, Gamepad2, Brain, Mic, Timer, Lock, Crown, ChevronRight, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_WORDS = [
  { word: "consistency", meaning: "일관성", pos: "명사" },
  { word: "significant", meaning: "중요한, 상당한", pos: "형용사" },
  { word: "implement", meaning: "구현하다, 실행하다", pos: "동사" },
  { word: "evaluate", meaning: "평가하다", pos: "동사" },
  { word: "comprehensive", meaning: "포괄적인, 종합적인", pos: "형용사" },
  { word: "determine", meaning: "결정하다, 알아내다", pos: "동사" },
  { word: "crucial", meaning: "중대한, 결정적인", pos: "형용사" },
  { word: "analyze", meaning: "분석하다", pos: "동사" },
  { word: "efficient", meaning: "효율적인", pos: "형용사" },
  { word: "alternative", meaning: "대안", pos: "명사" },
  { word: "collaborate", meaning: "협력하다", pos: "동사" },
  { word: "fundamental", meaning: "기본적인, 근본적인", pos: "형용사" },
  { word: "innovation", meaning: "혁신", pos: "명사" },
  { word: "perspective", meaning: "관점, 시각", pos: "명사" },
  { word: "strategy", meaning: "전략", pos: "명사" },
  { word: "sustainable", meaning: "지속 가능한", pos: "형용사" },
  { word: "verify", meaning: "검증하다, 확인하다", pos: "동사" },
  { word: "integrate", meaning: "통합하다", pos: "동사" },
  { word: "optimize", meaning: "최적화하다", pos: "동사" },
  { word: "robust", meaning: "튼튼한, 강력한", pos: "형용사" },
  { word: "mitigate", meaning: "완화하다, 경감시키다", pos: "동사" },
];

const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export default function QuizPage() {
  // 👇 2. 화면 전환 스위치 및 PRO 모달 상태 추가
  const [activeView, setActiveView] = useState<'dashboard' | 'word-quiz'>('dashboard');
  const [showProModal, setShowProModal] = useState(false);
  const isProUser = false; // 테스트용: 항상 무료 유저로 설정

  // --- 기존 퀴즈 상태들 ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);

  // 2x2 대시보드 퀴즈 목록
  const quizModes = [
    {
      id: 'word-quiz',
      title: '단어 퀴즈',
      description: '내 단어장과 필수 단어가 혼합된 20문제가 출제됩니다.',
      icon: <Gamepad2 className="w-8 h-8 text-violet-500" />,
      isPro: false,
      color: 'bg-violet-50 border-violet-200 hover:border-violet-400',
    },
    {
      id: 'weakness',
      title: 'AI 오답 노트 (심화)',
      description: '기록장에서 내가 자주 틀렸던 문법을 AI가 빈칸 문제로 변형합니다.',
      icon: <Brain className="w-8 h-8 text-rose-500" />,
      isPro: true,
      color: 'bg-rose-50 border-rose-200 hover:border-rose-400',
    },
    {
      id: 'speaking',
      title: '실전 발음 트레이닝',
      description: '문장을 읽고 원어민 AI에게 실시간 억양 및 발음 점수를 평가받습니다.',
      icon: <Mic className="w-8 h-8 text-emerald-500" />,
      isPro: true,
      color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    },
    {
      id: 'timeattack',
      title: '타임어택 챌린지',
      description: '제한 시간 3분 안에 최대한 많은 영작 문장을 완성해야 하는 서바이벌!',
      icon: <Timer className="w-8 h-8 text-amber-500" />,
      isPro: true,
      color: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    },
  ];

  // 카드 클릭 핸들러
  const handleCardClick = (mode: typeof quizModes[0]) => {
    if (mode.isPro && !isProUser) {
      setShowProModal(true); // 유료 기능이면 모달 띄우기
    } else if (mode.id === 'word-quiz') {
      setActiveView('word-quiz'); // 무료 단어 퀴즈면 화면 전환
      startQuiz();
    }
  };

  // --- 기존 기능 함수들 ---
  const playAudio = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const saveToVocab = async (word: string, meaning: string, pos: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error("로그인 정보가 만료되었습니다. 다시 로그인해 주세요.");

      const today = new Date().toISOString();
      const { error } = await supabase.from('vocab').insert([{ word, meaning, pos: pos || '기타', date: today, user_id: user.id }]);
      
      if (error) {
        if (error.code === '23505') toast.error(`'${word}' 단어는 이미 단어장에 있습니다!`);
        else toast.error(`저장 실패: ${error.message}`);
        return;
      }
      toast.success(`'${word}' 단어가 저장되었습니다!`);
    } catch (error: any) {
      toast.error(`예상치 못한 에러: ${error.message}`);
    }
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      const { data: userVocab } = await supabase.from('vocab').select('word, meaning, pos');
      let myWords = userVocab || [];
      
      // 1. 내 단어장에서 최대 10개 랜덤 추출
      myWords = shuffleArray(myWords).slice(0, 10);
      const neededCount = 20 - myWords.length;

      // 👇 추가된 핵심 로직 1: 문제 중복 방지
      // 내 단어장(myWords)에 이미 뽑힌 단어는 기본 단어(DEFAULT_WORDS) 목록에서 아예 빼버립니다.
      const myWordTextList = myWords.map(w => w.word.toLowerCase());
      const filteredDefaultWords = DEFAULT_WORDS.filter(w => !myWordTextList.includes(w.word.toLowerCase()));

      // 2. 모자란 개수만큼 '걸러진' 기본 단어에서 랜덤 추출 후 20개 합치기
      const extraWords = shuffleArray(filteredDefaultWords).slice(0, neededCount);
      const combinedWords = shuffleArray([...myWords, ...extraWords]);

      // 👇 추가된 핵심 로직 2: 보기(선택지) 중복 방지
      // 보기 4개 중에 똑같은 뜻이 두 번 나오지 않게 하려고 Set을 이용해 전체 뜻의 중복을 싹 없앱니다.
      const allUniqueMeanings = Array.from(new Set([...myWords, ...DEFAULT_WORDS].map(item => item.meaning)));

      const generatedQuestions = combinedWords.map((correctItem) => {
        // 정답을 제외한 깨끗한 오답 3개 무작위 추출
        const wrongMeanings = shuffleArray(allUniqueMeanings)
          .filter(meaning => meaning !== correctItem.meaning)
          .slice(0, 3);
        
        // 정답 1개 + 오답 3개를 섞어서 최종 보기 4개 생성
        const options = shuffleArray([correctItem.meaning, ...wrongMeanings]);

        return { word: correctItem.word, answer: correctItem.meaning, pos: correctItem.pos, options };
      });

      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setScore(0);
      setWrongQuestions([]);
      setIsFinished(false);
      setIsPlaying(true);
      setIsRevealed(false);
      setSelectedOption(null);
    } catch (error) {
      toast.error("퀴즈를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const retryWrongQuestions = () => {
    if (wrongQuestions.length === 0) return;
    const reshuffledWrongQs = shuffleArray([...wrongQuestions]).map(q => ({
      ...q, options: shuffleArray([...q.options])
    }));
    setQuestions(reshuffledWrongQs);
    setCurrentIdx(0);
    setScore(0);
    setWrongQuestions([]);
    setIsFinished(false);
    setIsPlaying(true);
    setIsRevealed(false);
    setSelectedOption(null);
  };

  const handleAnswerClick = (option: string) => {
    if (isRevealed) return;
    setSelectedOption(option);
    setIsRevealed(true);

    const currentQ = questions[currentIdx];
    const isCorrect = option === currentQ.answer;

    if (isCorrect) setScore((prev) => prev + 1);
    else setWrongQuestions((prev) => [...prev, currentQ]);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((prev) => prev + 1);
        setIsRevealed(false);
        setSelectedOption(null);
      } else {
        setIsFinished(true);
      }
    }, 1000);
  };

  const resetQuiz = () => {
    setIsPlaying(false);
    setIsFinished(false);
    setActiveView('dashboard'); // 👇 퀴즈 끝나면 대시보드로 돌아가기
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      {/* 🚀 1. 대시보드 화면 */}
      {activeView === 'dashboard' && (
        <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto animate-in fade-in duration-300">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">학습 퀴즈 센터 🎮</h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">배운 내용을 다채로운 방식으로 복습하고 내 것으로 만들어보세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {quizModes.map((mode) => (
              <div
                key={mode.id}
                onClick={() => handleCardClick(mode)}
                className={`relative p-6 md:p-8 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm group overflow-hidden bg-white
                  ${mode.isPro && !isProUser 
                    ? 'border-slate-200 opacity-80 grayscale-[30%] hover:grayscale-0 hover:shadow-md' 
                    : `border-transparent hover:shadow-lg ${mode.color}` 
                  }`}
              >
                {mode.isPro && !isProUser && (
                  <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-md z-10">
                    <Lock className="w-3 h-3 text-amber-300" />
                    <span>PRO 전용</span>
                  </div>
                )}
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  {mode.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">{mode.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed min-h-[40px]">{mode.description}</p>
                <div className="mt-6 flex justify-end">
                  <div className={`p-2 rounded-full transition-colors ${mode.isPro && !isProUser ? 'bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600' : 'bg-white text-slate-400 group-hover:bg-violet-600 group-hover:text-white shadow-sm'}`}>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 2. 단어 퀴즈 화면 (기존 코드) */}
      {activeView === 'word-quiz' && (
        <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
          
          {/* 뒤로가기 버튼 추가 */}
          <div className="w-full mb-6 flex items-center gap-4">
            <button 
              onClick={() => setActiveView('dashboard')}
              className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">단어 퀴즈</h1>
              <p className="text-slate-500 text-sm">내 단어장과 기본 필수 단어가 혼합된 20문제가 출제됩니다.</p>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 w-full min-h-[400px] flex flex-col items-center justify-center">
            {/* {!isPlaying && (
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-xl font-semibold text-slate-700 mb-6">퀴즈를 시작할 준비가 되셨나요?</h2>
                <button 
                  onClick={startQuiz}
                  disabled={isLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? "문제 출제 중..." : "20문제 퀴즈 시작하기"}
                </button>
              </div>
            )} */}
            {/* 카드를 누른 직후, DB에서 문제를 가져오는 0.5초 동안 보여줄 로딩 화면 */}
            {!isPlaying && (
              <div className="text-center flex flex-col items-center justify-center animate-pulse">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                  <Gamepad2 className="w-6 h-6 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">AI가 맞춤형 퀴즈를 생성하고 있습니다...</h2>
                <p className="text-sm text-slate-500">내 단어장 데이터를 분석 중입니다</p>
              </div>
            )}

            {isPlaying && !isFinished && (
              <div className="w-full max-w-lg animate-in fade-in">
                <div className="flex justify-between items-center mb-8 text-slate-500 font-medium">
                  <span>문제 {currentIdx + 1} / {questions.length}</span>
                  <span>현재 점수: {score}점</span>
                </div>
                
                <div className="text-center mb-10 flex flex-col items-center gap-4">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{questions[currentIdx].word}</span>
                  <div className="flex gap-2">
                    <button onClick={() => playAudio(questions[currentIdx].word)} className="flex items-center gap-1.5 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold hover:bg-violet-200 transition-colors cursor-pointer">
                      <Play className="w-4 h-4 fill-current" /> 발음 듣기
                    </button>
                    <button onClick={() => saveToVocab(questions[currentIdx].word, questions[currentIdx].answer, questions[currentIdx].pos)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-200 transition-colors cursor-pointer">
                      <Bookmark className="w-4 h-4" /> 단어장 저장
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {questions[currentIdx].options.map((option: string, idx: number) => {
                    let btnStyle = "bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border-slate-200 text-slate-700";
                    if (isRevealed) {
                      if (option === questions[currentIdx].answer) btnStyle = "bg-green-100 border-green-500 text-green-800 font-bold";
                      else if (option === selectedOption) btnStyle = "bg-red-100 border-red-500 text-red-800 font-bold";
                      else btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                    }
                    return (
                      <button key={idx} onClick={() => handleAnswerClick(option)} disabled={isRevealed} className={`border p-4 rounded-xl font-medium transition-all text-center cursor-pointer ${btnStyle}`}>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isFinished && (
              <div className="w-full max-w-2xl flex flex-col items-center animate-in zoom-in-95">
                <div className="text-center w-full max-w-md">
                  <div className="text-6xl mb-4">{score === questions.length ? "🏆" : "👏"}</div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">퀴즈 완료!</h2>
                  
                  <div className="bg-slate-50 rounded-xl p-6 mb-8 flex justify-around border border-slate-200">
                    <div className="flex flex-col"><span className="text-slate-500 text-sm mb-1">정답</span><span className="text-2xl font-black text-green-600">{score}개</span></div>
                    <div className="w-px bg-slate-200"></div>
                    <div className="flex flex-col"><span className="text-slate-500 text-sm mb-1">오답</span><span className="text-2xl font-black text-red-500">{wrongQuestions.length}개</span></div>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    {wrongQuestions.length > 0 && (
                      <button onClick={retryWrongQuestions} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full cursor-pointer shadow-md">
                        <RotateCcw className="w-5 h-5" /> 오답만 다시 풀기
                      </button>
                    )}
                    <button onClick={resetQuiz} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full cursor-pointer">
                      대시보드로 돌아가기
                    </button>
                  </div>
                </div>

                {wrongQuestions.length > 0 && (
                  <div className="w-full mt-12 pt-8 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">틀린 단어 복습하기</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {wrongQuestions.map((q, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-900">{q.word}</span>
                            <span className="text-sm text-slate-500">{q.answer}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => playAudio(q.word)} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-violet-50 text-violet-600 transition-colors cursor-pointer"><Play className="w-4 h-4 fill-current" /></button>
                            <button onClick={() => saveToVocab(q.word, q.answer, q.pos)} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer"><Bookmark className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 👑 3. PRO 업그레이드 모달 */}
      {showProModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-3xl -z-10" />
            <button onClick={() => setShowProModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mt-2 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-violet-200"><Crown className="w-7 h-7 text-white" /></div>
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-1.5">Zipil PRO</h3>
              <p className="text-xs text-slate-500 font-medium">더 강력한 AI 기능으로 영작 마스터가 되세요</p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { icon: '✨', text: '하루 5회 제한 없는 무제한 AI 영작 교정' },
                { icon: '🧠', text: '내 약점을 파고드는 AI 맞춤형 심화 퀴즈' },
                { icon: '🎙️', text: '원어민 수준의 정밀 발음 분석 및 피드백' },
                { icon: '📥', text: '학습 기록장 및 단어장 PDF 리포트 추출' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-lg shrink-0">{feature.icon}</span><span className="text-sm font-semibold text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>
            <div className="text-center mb-4">
              <div className="flex items-end justify-center gap-1 mb-3">
                <span className="text-3xl font-extrabold text-slate-900">₩9,900</span><span className="text-sm font-medium text-slate-500 mb-1">/ 월</span>
              </div>
              <button onClick={() => { toast.success("현재는 베타 서비스 기간으로 모든 기능이 무료로 제공됩니다! 🎉", { duration: 4000 }); setShowProModal(false); }} className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5">
                PRO 플랜 7일 무료 체험하기
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400">언제든지 취소할 수 있습니다.</p>
          </div>
        </div>
      )}
    </main>
  );
}