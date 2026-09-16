"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Bookmark, RotateCcw, Gamepad2, Brain, Mic, Timer, Lock, Crown, ChevronRight, X, ChevronLeft, Send, CheckCircle2, XCircle, Volume2, Eye, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_WORDS = [
  { word: "consistency", meaning: "일관성", pos: "명사" },
  { word: "significant", meaning: "중요한, 상당한", pos: "형용사" },
  { word: "implement", meaning: "구현하다, 실행하다", pos: "동사" },
  { word: "evaluate", meaning: "평가하다", pos: "동사" },
  { word: "comprehensive", meaning: "포괄적인, 종합적인", pos: "형용사" },
  { word: "determine", meaning: "결정하다, 알아내다", pos: "동사" },
  { word: "crucial", meaning: "중대한, 결정적인", pos: "형용사" },
  { word: "analyze", 단어: "분석하다", pos: "동사" },
];

const FALLBACK_SENTENCES: Record<string, {en: string, ko: string}> = {
  "consistency": { en: "We need to maintain consistency in our design.", ko: "우리는 디자인에서 일관성을 유지해야 합니다." },
  "significant": { en: "There is a significant difference between the two.", ko: "두 가지 사이에는 상당한 차이가 있습니다." },
  "implement": { en: "We plan to implement the new system next week.", ko: "우리는 다음 주에 새 시스템을 도입할 계획입니다." },
  "evaluate": { en: "The manager will evaluate your performance.", ko: "매니저가 당신의 성과를 평가할 것입니다." },
  "comprehensive": { en: "This is a comprehensive guide to React.", ko: "이것은 리액트에 대한 포괄적인 가이드입니다." },
  "determine": { en: "It is hard to determine the exact cause.", ko: "정확한 원인을 알아내기 어렵습니다." },
  "crucial": { en: "Time management is crucial for success.", ko: "시간 관리는 성공을 위해 결정적입니다." },
  "analyze": { en: "We must analyze the data carefully.", ko: "우리는 데이터를 주의 깊게 분석해야 합니다." },
};

const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export default function QuizPage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'word-quiz' | 'weakness-quiz'>('dashboard');
  const [showProModal, setShowProModal] = useState(false);
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    // 앱이 켜질 때 로그인한 유저가 '관리자'인지 확인하는 함수
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 👑 여기에 유저님(관리자)의 실제 가입 이메일을 적어주세요!
      const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com']; 
      
      // 내 이메일이 관리자 리스트에 있다면 무조건 PRO 유저로 승격!
      if (ADMIN_EMAILS.includes(user.email || '')) {
        setIsProUser(true);
      }
    };
    
    checkAdminStatus();
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
  
  // 객관식 퀴즈 전용 상태
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // --- 🚀 심화 타이핑 퀴즈 전용 상태 ---
  const [typingInput, setTypingInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHint, setShowHint] = useState(false);
  const [isHintUsed, setIsHintUsed] = useState(false); 
  const [isTypingError, setIsTypingError] = useState(false); 
  const [isTypingCompleted, setIsTypingCompleted] = useState(false); 

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
      description: '기록장에서 내가 썼던 문장을 AI가 빈칸 문제로 변형합니다.',
      icon: <Brain className="w-8 h-8 text-rose-500" />,
      isPro: false,
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

  const handleCardClick = (mode: typeof quizModes[0]) => {
    if (mode.isPro && !isProUser) {
      setShowProModal(true); 
    } else if (mode.id === 'word-quiz') {
      setActiveView('word-quiz'); 
      startQuiz();
    } else if (mode.id === 'weakness') {
      setActiveView('weakness-quiz'); 
      startWeaknessQuiz();
    }
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // --- 기존 기능 (단어장 퀴즈) ---
  const startQuiz = async () => {
    setIsLoading(true);
    try {
      const { data: userVocab } = await supabase.from('vocab').select('word, meaning, pos');
      let myWords = userVocab || [];
      myWords = shuffleArray(myWords).slice(0, 10);
      const neededCount = 20 - myWords.length;

      const myWordTextList = myWords.map(w => w.word.toLowerCase());
      const filteredDefaultWords = DEFAULT_WORDS.filter(w => !myWordTextList.includes(w.word.toLowerCase()));
      const extraWords = shuffleArray(filteredDefaultWords).slice(0, neededCount);
      const combinedWords = shuffleArray([...myWords, ...extraWords]);

      const allUniqueMeanings = Array.from(new Set([...myWords, ...DEFAULT_WORDS].map(item => item.meaning || item.단어)));

      const generatedQuestions = combinedWords.map((correctItem) => {
        const wrongMeanings = shuffleArray(allUniqueMeanings)
          .filter(meaning => meaning !== (correctItem.meaning || correctItem.단어))
          .slice(0, 3);
        const options = shuffleArray([(correctItem.meaning || correctItem.단어), ...wrongMeanings]);
        return { word: correctItem.word, answer: (correctItem.meaning || correctItem.단어), pos: correctItem.pos, options };
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

  // --- 🚀 AI 오답 노트 (빈칸 타이핑) 로직 ---
  const startWeaknessQuiz = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: userVocab } = await supabase.from('vocab').select('*').eq('user_id', user?.id);
      let myWords = userVocab || [];
      
      myWords = shuffleArray(myWords).slice(0, 10);
      const neededCount = 10 - myWords.length;
      const myWordTextList = myWords.map((w: any) => w.word.toLowerCase());
      const filteredDefaultWords = DEFAULT_WORDS.filter(w => !myWordTextList.includes(w.word.toLowerCase()));
      const extraWords = shuffleArray(filteredDefaultWords).slice(0, neededCount);
      const targetWords = shuffleArray([...myWords, ...extraWords]);

      let historyDataList: any[] = [];
      try {
        const { data: historyData } = await supabase.from('history').select('original_text, corrected_text').eq('user_id', user?.id);
        if (historyData) historyDataList = historyData;
      } catch (e) { console.log("기록장이 없거나 에러 발생."); }

      const generatedQuestions = [];

      for (const item of targetWords) {
        const word = item.word.toLowerCase();
        let matchedSentenceEn = "";
        let matchedSentenceKo = "";

        const historyMatch = historyDataList.find(h => h.corrected_text && h.corrected_text.toLowerCase().includes(word));
        
        if (historyMatch) {
          matchedSentenceEn = historyMatch.corrected_text;
          matchedSentenceKo = historyMatch.original_text || "(사용자가 과거에 직접 작성했던 영작 문장입니다)";
        } else {
          const wordMeaning = item.meaning || item.단어 || "";
          const fallback = FALLBACK_SENTENCES[word] || { 
            en: `I need to memorize the word '${word}'.`, 
            ko: `나는 '${wordMeaning}'(이)라는 단어를 외워야 한다.` 
          };
          matchedSentenceEn = fallback.en;
          matchedSentenceKo = fallback.ko;
        }

        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const maskedSentence = matchedSentenceEn.replace(regex, '________');

        generatedQuestions.push({
          word: word,
          answer: word,
          meaning: item.meaning || item.단어,
          sentenceMeaning: matchedSentenceKo,
          originalSentence: matchedSentenceEn,
          maskedSentence: maskedSentence,
        });
      }

      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setScore(0);
      setWrongQuestions([]);
      setIsFinished(false);
      setIsPlaying(true);
      
      setTypingInput("");
      setShowHint(false);
      setIsHintUsed(false);
      setIsTypingCompleted(false);
      setIsTypingError(false);
    } catch (error) {
      toast.error("퀴즈를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypingSubmit = () => {
    if (isTypingCompleted || !typingInput.trim()) return;
    
    const currentQ = questions[currentIdx];
    const isCorrect = typingInput.trim().toLowerCase() === currentQ.answer.toLowerCase();

    if (isCorrect) {
      setIsTypingCompleted(true); 
      
      if (!isHintUsed) {
        setScore((prev) => prev + 1);
      } else {
        setWrongQuestions((prev) => {
          if (prev.find(q => q.word === currentQ.word)) return prev;
          return [...prev, currentQ];
        });
      }
      playAudio(currentQ.originalSentence);
    } else {
      setIsTypingError(true);
      setIsHintUsed(true);
      setShowHint(true);
      
      setTimeout(() => setIsTypingError(false), 800); 
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleGiveUp = () => {
    if (isTypingCompleted) return;
    const currentQ = questions[currentIdx];
    
    setTypingInput(currentQ.answer); 
    setIsTypingCompleted(true); 
    setIsHintUsed(true); 

    setWrongQuestions((prev) => {
      if (prev.find(q => q.word === currentQ.word)) return prev;
      return [...prev, currentQ];
    });

    playAudio(currentQ.originalSentence);
  };

  const handleNextTypingQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setIsTypingCompleted(false);
      setTypingInput("");
      setShowHint(false);
      setIsHintUsed(false);
      setIsTypingError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsFinished(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isTypingCompleted) {
        handleNextTypingQuestion(); 
      } else {
        handleTypingSubmit(); 
      }
    }
  };

  const retryWrongQuestions = () => {
    if (wrongQuestions.length === 0) return;
    
    let reshuffledWrongQs;
    if (activeView === 'word-quiz') {
      reshuffledWrongQs = shuffleArray([...wrongQuestions]).map(q => ({
        ...q, options: shuffleArray([...q.options])
      }));
    } else {
      reshuffledWrongQs = shuffleArray([...wrongQuestions]);
    }

    setQuestions(reshuffledWrongQs);
    setCurrentIdx(0);
    setScore(0);
    setWrongQuestions([]);
    setIsFinished(false);
    setIsPlaying(true);
    
    setIsRevealed(false);
    setSelectedOption(null);
    setTypingInput(""); 
    setShowHint(false);
    setIsHintUsed(false);
    setIsTypingCompleted(false);
  };

  const resetQuiz = () => {
    setIsPlaying(false);
    setIsFinished(false);
    setActiveView('dashboard');
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      {/* 1. 대시보드 화면 */}
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

      {/* 2. 단어 퀴즈 화면 (객관식 - 기존 유지) */}
      {activeView === 'word-quiz' && (
        <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
          <div className="w-full mb-6 flex items-center gap-4">
            <button onClick={resetQuiz} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">단어 퀴즈</h1>
              <p className="text-slate-500 text-sm">내 단어장과 기본 필수 단어가 혼합된 20문제가 출제됩니다.</p>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 w-full min-h-[400px] flex flex-col items-center justify-center">
             {!isPlaying && (
              <div className="text-center flex flex-col items-center justify-center animate-pulse">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                  <Gamepad2 className="w-6 h-6 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">AI가 맞춤형 퀴즈를 생성하고 있습니다...</h2>
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
               <div className="text-center w-full max-w-md">
                 <div className="text-6xl mb-4">🏆</div>
                 <h2 className="text-2xl font-bold text-slate-900 mb-6">퀴즈 완료!</h2>
                 <button onClick={resetQuiz} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold w-full cursor-pointer">대시보드로 돌아가기</button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* 🚀 3. 심화 빈칸 타이핑 퀴즈 화면 */}
      {activeView === 'weakness-quiz' && (
        <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
          <div className="w-full mb-6 flex items-center gap-4">
            <button onClick={resetQuiz} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-rose-600 mb-1 flex items-center gap-2">
                <Brain className="w-6 h-6" /> AI 오답 노트 (심화)
              </h1>
              <p className="text-slate-500 text-sm">내가 과거에 교정받았던 문장의 빈칸을 채워보세요.</p>
            </div>
          </div>

          <div className="bg-white p-6 md:p-12 rounded-3xl shadow-sm border border-slate-200 w-full min-h-[400px] flex flex-col items-center justify-center">
            
            {!isPlaying && (
              <div className="text-center flex flex-col items-center justify-center animate-pulse">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin"></div>
                  <Brain className="w-6 h-6 text-rose-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">과거 학습 기록을 분석 중입니다...</h2>
                <p className="text-sm text-slate-500">내 문장을 기반으로 퀴즈를 생성합니다</p>
              </div>
            )}
            
            {isPlaying && !isFinished && (
              <div className="w-full max-w-xl animate-in fade-in">
                <div className="flex justify-between items-center mb-10 text-slate-500 font-medium border-b border-slate-100 pb-4">
                  <span>문제 {currentIdx + 1} / {questions.length}</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-700">현재 점수: <strong className="text-rose-600">{score}</strong></span>
                </div>
                
                <div className="text-center mb-8">
                  <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-8 px-4 break-keep">
                    "{questions[currentIdx].sentenceMeaning}"
                  </h3>
                  
                  {/* 👇 여기가 똑똑한 문맥 맞춤형 힌트 로직입니다! */}
                  {(() => {
                    const meanings = questions[currentIdx].meaning.split(',').map((m: string) => m.trim());
                    const sentenceKo = questions[currentIdx].sentenceMeaning;
                    
                    let mainMeaning = meanings[0];
                    let subMeanings = meanings.slice(1);

                    const matchedIndex = meanings.findIndex((m: string) => sentenceKo.includes(m.substring(0, 2)));
                    
                    if (matchedIndex > 0) {
                      mainMeaning = meanings[matchedIndex];
                      subMeanings = meanings.filter((_: any, idx: number) => idx !== matchedIndex);
                    }

                    return (
                      <span className="inline-block bg-rose-50 text-rose-600 font-bold px-4 py-1.5 rounded-full text-sm mb-4 shadow-sm">
                        💡 힌트: {mainMeaning} 
                        {subMeanings.length > 0 && (
                          <span className="text-rose-400 font-medium ml-1">
                            ({subMeanings.join(', ')})
                          </span>
                        )}
                      </span>
                    );
                  })()}
                  
                  <div className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed font-serif flex flex-wrap justify-center items-center gap-y-4">
                    {isTypingCompleted ? (
                      questions[currentIdx].originalSentence.split(new RegExp(`\\b${questions[currentIdx].answer}\\b`, 'gi')).map((part: string, i: number, arr: any[]) => (
                        <React.Fragment key={i}>
                          <span>{part}</span>
                          {i !== arr.length - 1 && (
                            <span className="text-green-600 font-bold mx-1 border-b-4 border-green-200">
                              {questions[currentIdx].answer}
                            </span>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      questions[currentIdx].maskedSentence.split('________').map((part: string, i: number, arr: any[]) => (
                        <React.Fragment key={i}>
                          <span>{part}</span>
                          {i !== arr.length - 1 && (
                            <span className="inline-block border-b-4 border-slate-300 w-24 mx-2 text-center text-rose-500 font-bold relative top-[2px]">
                              {showHint ? questions[currentIdx].answer.charAt(0) : '\u00A0'}
                            </span>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </div>

                {!isTypingCompleted && !showHint && (
                  <div className="flex justify-center mb-6">
                    <button 
                      onClick={() => { setShowHint(true); setIsHintUsed(true); setTimeout(() => inputRef.current?.focus(), 100); }} 
                      className="text-sm bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full font-bold hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
                    >
                      💡 첫 글자 힌트 보기
                    </button>
                  </div>
                )}

                <div className="relative max-w-sm mx-auto mt-8 h-[72px]">
                  {!isTypingCompleted ? (
                    <div className="w-full flex flex-col gap-3">
                      <div className="relative w-full">
                        <input
                          ref={inputRef}
                          type="text"
                          value={typingInput}
                          onChange={(e) => setTypingInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="빈칸의 단어를 입력하세요"
                          autoFocus
                          autoComplete="off"
                          spellCheck="false"
                          className={`w-full p-4 pl-6 pr-14 text-center text-xl font-bold rounded-2xl border-2 transition-all outline-none 
                            ${isTypingError 
                              ? "bg-red-50 border-red-500 text-red-600" 
                              : "bg-white border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 text-slate-900"
                            }`}
                        />
                        <button 
                          onClick={handleTypingSubmit}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                      <button 
                        onClick={handleGiveUp}
                        className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-4 mt-2 font-medium mx-auto"
                      >
                        모르겠어요 (정답 확인)
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <button 
                        onClick={() => playAudio(questions[currentIdx].originalSentence)}
                        className="p-4 rounded-2xl border-2 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={handleNextTypingQuestion}
                        className="flex-1 p-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        다음 문제 <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isFinished && (
               <div className="w-full max-w-2xl flex flex-col items-center animate-in zoom-in-95">
                 <div className="text-center w-full max-w-md">
                   <div className="text-6xl mb-4 text-center mx-auto bg-rose-100 w-24 h-24 rounded-full flex items-center justify-center">
                     {score === questions.length ? "🏆" : "🎯"}
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-6">심화 퀴즈 완료!</h2>
                   
                   <div className="bg-slate-50 rounded-xl p-6 mb-8 flex justify-around border border-slate-200 shadow-inner">
                     <div className="flex flex-col"><span className="text-slate-500 text-sm mb-1">정답</span><span className="text-2xl font-black text-green-600">{score}개</span></div>
                     <div className="w-px bg-slate-200"></div>
                     <div className="flex flex-col"><span className="text-slate-500 text-sm mb-1">오답</span><span className="text-2xl font-black text-rose-500">{wrongQuestions.length}개</span></div>
                   </div>

                   <div className="flex flex-col gap-3 w-full">
                     {wrongQuestions.length > 0 && (
                       <button onClick={retryWrongQuestions} className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full cursor-pointer shadow-md">
                         <RotateCcw className="w-5 h-5" /> 오답만 다시 풀기
                       </button>
                     )}
                     <button onClick={resetQuiz} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold w-full cursor-pointer transition-colors">
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
                             <span className="text-sm text-slate-500">{q.meaning}</span>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => playAudio(q.word)} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer shadow-sm">
                               <Play className="w-4 h-4 fill-current" />
                             </button>
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

      {/* PRO 모달 */}
      {showProModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowProModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mt-2 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center mb-3"><Crown className="w-7 h-7 text-white" /></div>
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-1.5">Zipil PRO</h3>
              <p className="text-xs text-slate-500">더 강력한 AI 기능으로 영작 마스터가 되세요</p>
            </div>
            <div className="text-center mb-4">
              <div className="flex items-end justify-center gap-1 mb-3">
                <span className="text-3xl font-extrabold text-slate-900">₩9,900</span><span className="text-sm font-medium text-slate-500 mb-1">/ 월</span>
              </div>
              <button onClick={() => { toast.success("현재는 베타 서비스 기간으로 모든 기능이 무료로 제공됩니다! 🎉"); setShowProModal(false); }} className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold">
                PRO 플랜 무료 체험하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}