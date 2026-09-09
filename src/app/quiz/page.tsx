"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Bookmark, RotateCcw } from 'lucide-react';

// 👇 1. DEFAULT_WORDS에 각 단어의 정확한 품사(pos)를 추가했습니다.
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);

  const playAudio = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // 👇 2. 함수가 품사(pos)도 전달받도록 수정되었습니다.
  const saveToVocab = async (word: string, meaning: string, pos: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 정보가 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const today = new Date().toISOString();

      const { error } = await supabase
        .from('vocab')
        .insert([{ 
          word: word, 
          meaning: meaning,
          pos: pos || '기타', // 전달받은 품사가 있으면 쓰고, 만약 없으면 방어용으로 '기타' 사용
          date: today,
          user_id: user.id 
        }]);
      
      if (error) {
        if (error.code === '23505') {
          alert(`'${word}' 단어는 이미 단어장에 있습니다!`);
        } else {
          alert(`저장 실패: ${error.message}`);
        }
        return;
      }

      alert(`'${word}' 단어가 내 단어장에 성공적으로 저장되었습니다!`);
    } catch (error: any) {
      alert(`예상치 못한 에러: ${error.message}`);
    }
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      // 👇 DB에서 가져올 때 pos(품사)도 같이 가져옵니다.
      const { data: userVocab } = await supabase.from('vocab').select('word, meaning, pos');
      let myWords = userVocab || [];
      
      myWords = shuffleArray(myWords).slice(0, 10);
      const neededCount = 20 - myWords.length;
      const extraWords = shuffleArray(DEFAULT_WORDS).slice(0, neededCount);
      const combinedWords = shuffleArray([...myWords, ...extraWords]);

      const generatedQuestions = combinedWords.map((correctItem) => {
        const wrongMeanings = shuffleArray([...myWords, ...DEFAULT_WORDS])
          .filter(item => item.meaning !== correctItem.meaning)
          .slice(0, 3)
          .map(item => item.meaning);
        
        const options = shuffleArray([correctItem.meaning, ...wrongMeanings]);

        return {
          word: correctItem.word,
          answer: correctItem.meaning,
          pos: correctItem.pos, // 👇 퀴즈 데이터에 품사 정보 추가
          options: options
        };
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
      alert("퀴즈를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const retryWrongQuestions = () => {
    if (wrongQuestions.length === 0) return;
    
    const reshuffledWrongQs = shuffleArray([...wrongQuestions]).map(q => ({
      ...q,
      options: shuffleArray([...q.options])
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

    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else {
      setWrongQuestions((prev) => [...prev, currentQ]);
    }

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
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center">
      <div className="w-full mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">단어 퀴즈</h1>
        <p className="text-slate-500">내 단어장과 기본 필수 단어가 혼합된 20문제가 출제됩니다.</p>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-200 w-full min-h-[400px] flex flex-col items-center justify-center">
        
        {!isPlaying && (
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
        )}

        {isPlaying && !isFinished && (
          <div className="w-full max-w-lg">
            <div className="flex justify-between items-center mb-8 text-slate-500 font-medium">
              <span>문제 {currentIdx + 1} / {questions.length}</span>
              <span>현재 점수: {score}점</span>
            </div>
            
            <div className="text-center mb-10 flex flex-col items-center gap-4">
              <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {questions[currentIdx].word}
              </span>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => playAudio(questions[currentIdx].word)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold hover:bg-violet-200 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> 발음 듣기
                </button>
                {/* 👇 3. 저장 버튼 클릭 시, 해당 문제의 품사(pos)도 같이 전달합니다. */}
                <button 
                  onClick={() => saveToVocab(questions[currentIdx].word, questions[currentIdx].answer, questions[currentIdx].pos)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" /> 단어장 저장
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {questions[currentIdx].options.map((option: string, idx: number) => {
                let btnStyle = "bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border-slate-200 text-slate-700";
                
                if (isRevealed) {
                  if (option === questions[currentIdx].answer) {
                    btnStyle = "bg-green-100 border-green-500 text-green-800 font-bold";
                  } else if (option === selectedOption) {
                    btnStyle = "bg-red-100 border-red-500 text-red-800 font-bold";
                  } else {
                    btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerClick(option)}
                    disabled={isRevealed}
                    className={`border p-4 rounded-xl font-medium transition-all text-center cursor-pointer ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isFinished && (
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="text-center w-full max-w-md">
              <div className="text-6xl mb-4">{score === questions.length ? "🏆" : "👏"}</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">퀴즈 완료!</h2>
              
              <div className="bg-slate-50 rounded-xl p-6 mb-8 flex justify-around border border-slate-200">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm mb-1">정답</span>
                  <span className="text-2xl font-black text-green-600">{score}개</span>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm mb-1">오답</span>
                  <span className="text-2xl font-black text-red-500">{wrongQuestions.length}개</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {wrongQuestions.length > 0 && (
                  <button 
                    onClick={retryWrongQuestions}
                    className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-5 h-5" /> 오답만 다시 풀기
                  </button>
                )}
                <button 
                  onClick={resetQuiz}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full cursor-pointer"
                >
                  처음으로 돌아가기
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
                        <button onClick={() => playAudio(q.word)} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-violet-50 text-violet-600 transition-colors cursor-pointer" title="발음 듣기">
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        {/* 👇 여기도 품사(pos) 정보를 넘기도록 수정했습니다. */}
                        <button onClick={() => saveToVocab(q.word, q.answer, q.pos)} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer" title="단어장 저장">
                          <Bookmark className="w-4 h-4" />
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
  );
}