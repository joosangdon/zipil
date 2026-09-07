"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Volume2, 
  Mic, 
  Square, 
  CheckCircle2, 
  PenTool, 
  Loader2, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  X,
  Eye,
  EyeOff,
  Check // 👇 암기 완료 체크 아이콘 추가
} from "lucide-react";

interface HistoryItem {
  id: string;
  originalText: string;
  correctedText: string;
  nuance: string;
  date: string;
  isMemorized?: boolean; // 👇 암기 완료 여부 속성 추가
}

interface Token {
  word: string;
  pos: string;
  meaning: string;
}

interface AnalysisResult {
  corrected: string;
  korean_translation: string;
  explanation: string;
  tokens: Token[];
}

interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  pos: string;
  date: string;
  isMemorized?: boolean; // 👇 암기 완료 여부 속성 추가
}

const MAX_FREE_COUNT = 5;
const MAX_CHAR_LIMIT = 300;

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [showVocab, setShowVocab] = useState(false);

  const [isTokenView, setIsTokenView] = useState(false);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number | null>(null);

  const [remainingCount, setRemainingCount] = useState<number>(MAX_FREE_COUNT);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [pronunciationDetails, setPronunciationDetails] = useState<{word: string, isMatched: boolean}[] | null>(null);

  const [isHistoryBlindMode, setIsHistoryBlindMode] = useState(false);
  const [isVocabBlindMode, setIsVocabBlindMode] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // 👇 추가 1: 개별 음성 듣기 (미니 TTS)
  const playText = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!("speechSynthesis" in window)) {
      alert("브라우저가 음성 재생(TTS)을 지원하지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 👇 추가 2: 기록장 암기 완료 토글
  const toggleHistoryMemorized = (id: string) => {
    const updated = history.map(item => 
      item.id === id ? { ...item, isMemorized: !item.isMemorized } : item
    );
    setHistory(updated);
    localStorage.setItem('zipil_history', JSON.stringify(updated));
  };

  // 👇 추가 3: 단어장 암기 완료 토글
  const toggleVocabMemorized = (id: string) => {
    const updated = vocab.map(item => 
      item.id === id ? { ...item, isMemorized: !item.isMemorized } : item
    );
    setVocab(updated);
    localStorage.setItem('zipil_vocab', JSON.stringify(updated));
  };

  // 1. 일일 무료 사용량 로컬스토리지 초기화
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("zipil_usage_date");
      const savedCount = localStorage.getItem("zipil_remaining_count");

      if (savedDate !== today) {
        localStorage.setItem("zipil_usage_date", today);
        localStorage.setItem("zipil_remaining_count", MAX_FREE_COUNT.toString());
        setRemainingCount(MAX_FREE_COUNT);
      } else if (savedCount !== null) {
        setRemainingCount(parseInt(savedCount, 10));
      }
    }
  }, []);

  // 2. Web Speech API (STT) 초기화
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSpokenText(transcript);
          calculateScore(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [result]);

  // 3. 발음 일치도 점수 계산 로직
  const calculateScore = (userSpeech: string) => {
    if (!result) return;
    const targetWords = result.corrected.split(/\s+/); 
    const cleanTarget = result.corrected.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    const cleanSpoken = userSpeech.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);

    let matchCount = 0;
    const details = targetWords.map((originalWord, index) => {
      const cleanWord = cleanTarget[index];
      const isMatched = cleanSpoken.includes(cleanWord);
      
      if (isMatched) {
        matchCount++;
        const spokenIdx = cleanSpoken.indexOf(cleanWord);
        if (spokenIdx > -1) {
          cleanSpoken.splice(spokenIdx, 1);
        }
      }
      return { word: originalWord, isMatched };
    });

    const calculated = Math.round((matchCount / Math.max(cleanTarget.length, 1)) * 100);
    setPronunciationScore(Math.min(calculated, 100));
    setPronunciationDetails(details);
  };

  // 4. TTS: 원어민 발음 듣기
  const handlePlayTTS = () => {
    if (!result || !("speechSynthesis" in window)) {
      alert("브라우저가 음성 재생(TTS)을 지원하지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.corrected);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  // 5. STT: 녹음 토글
  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert("현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 권장합니다.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpokenText("");
      setPronunciationScore(null);
      setPronunciationDetails(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Recording start error:", err);
      }
    }
  };

  // 6. AI 분석 호출
  const handleAnalyze = async () => {
    const trimmed = inputText.trim();
    setErrorMessage(null);

    if (!trimmed) {
      setErrorMessage("교정할 문장을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_CHAR_LIMIT) {
      setErrorMessage(`최대 ${MAX_CHAR_LIMIT}자 이하로 입력해주세요.`);
      return;
    }
    if (remainingCount <= 0) {
      setShowLimitModal(true);
      return;
    }

    setLoading(true);
    setSpokenText("");
    setPronunciationScore(null);
    setActiveTokenIdx(null);
    setPronunciationDetails(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "서버 통신에 실패했습니다.");
      }

      const data = await res.json();
      setResult(data);
      saveToHistory(trimmed, data.corrected, data.explanation);

      const newCount = remainingCount - 1;
      setRemainingCount(newCount);
      localStorage.setItem("zipil_remaining_count", newCount.toString());

    } catch (err: any) {
      setErrorMessage(err.message || "문장 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenClick = (idx: number) => {
    setActiveTokenIdx(activeTokenIdx === idx ? null : idx);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('zipil_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);
  
  const saveToHistory = (original: string, corrected: string, nuance: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      originalText: original,
      correctedText: corrected,
      nuance: nuance,
      date: new Date().toLocaleDateString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    };
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('zipil_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (confirm('모든 학습 기록을 삭제하시겠습니까?')) {
      setHistory([]);
      localStorage.removeItem('zipil_history');
    }
  };

  useEffect(() => {
    const savedVocab = localStorage.getItem('zipil_vocab');
    if (savedVocab) {
      setVocab(JSON.parse(savedVocab));
    }
  }, []);

  const addToVocab = (word: string, meaning: string, pos: string) => {
    if (vocab.some(v => v.word.toLowerCase() === word.toLowerCase())) {
      alert("이미 단어장에 저장된 단어입니다.");
      return;
    }
    const newItem: VocabItem = {
      id: Date.now().toString(),
      word: word,
      meaning: meaning,
      pos: pos,
      date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    };
    const updatedVocab = [newItem, ...vocab];
    setVocab(updatedVocab);
    localStorage.setItem('zipil_vocab', JSON.stringify(updatedVocab));
    alert(`'${word}' 단어가 저장되었습니다!`);
  };

  const removeVocab = (id: string) => {
    const updatedVocab = vocab.filter(item => item.id !== id);
    setVocab(updatedVocab);
    localStorage.setItem('zipil_vocab', JSON.stringify(updatedVocab));
  };

  return (
    <main 
      className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center px-4 py-6 md:p-12 relative"
      onClick={() => setActiveTokenIdx(null)}
    >
      {/* 헤더 */}
      <header className="w-full max-w-4xl flex items-center justify-between py-3 mb-6 md:mb-8">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-xs shrink-0">
            <span className="font-bold text-amber-800 text-base md:text-lg tracking-wider">ㅈㅍㅈ</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-tight">집필중 (Zipil)</h1>
            <p className="text-[11px] md:text-xs text-slate-500">AI 영작 & 인터랙티브 발음 교정 워크스페이스</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <button
            onClick={() => setShowVocab(true)}
            className="text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>단어장</span>
            {vocab.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full">
                {vocab.length}
              </span>
            )}
          </button>
        <button
          onClick={() => setShowHistory(true)}
          className="text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer">
          <span>기록장</span>
          {history.length > 0 && (
            <span className="bg-slate-800 text-white text-[10px] px-1.5 rounded-full">
            {history.length}
            </span>
          )}
          </button>
          <span className={`text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border transition-colors ${
            remainingCount > 0 
              ? "bg-violet-100 text-violet-700 border-violet-200"
              : "bg-rose-100 text-rose-700 border-rose-200 animate-pulse"
          }`}>
            오늘 무료 {remainingCount}/{MAX_FREE_COUNT}
          </span>
        </div>
      </header>

      {/* 워크스페이스 */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        
        {/* 좌측: 문장 입력 카드 */}
        <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[380px] md:min-h-[480px]">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-amber-600" />
                작성할 문장 (한글 또는 영문)
              </label>
              <span className={`text-xs ${inputText.length > MAX_CHAR_LIMIT ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                {inputText.length}/{MAX_CHAR_LIMIT}자
              </span>
            </div>

            <textarea
              className={`w-full h-48 md:h-64 p-3.5 md:p-4 rounded-xl border focus:outline-hidden focus:ring-2 resize-none text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 bg-slate-50/50 transition-all ${
                inputText.length > MAX_CHAR_LIMIT 
                  ? "border-rose-300 focus:ring-rose-200" 
                  : "border-slate-200 focus:ring-amber-300 focus:border-transparent"
              }`}
              placeholder="영어로 표현하고 싶은 문장이나 교정받고 싶은 영어를 입력하세요..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {errorMessage && (
              <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim() || inputText.length > MAX_CHAR_LIMIT}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed mt-4 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                AI 분석 및 교정 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                AI 문장 교정 & 분석하기
              </>
            )}
          </button>
        </section>

        {/* 우측: 분석 및 발음 트레이닝 카드 */}
        <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[380px] md:min-h-[480px]">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                원어민 교정 결과
              </h2>

              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsTokenView(!isTokenView); }}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="단어 분해 학습 모드 토글"
                    >
                      {isTokenView ? (
                        <ToggleRight className="w-4 h-4 text-violet-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-medium text-[11px]">
                        {isTokenView ? "단어 분해" : "텍스트 뷰"}
                      </span>
                    </button>

                    <button 
                      onClick={handlePlayTTS}
                      disabled={isPlayingAudio}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                        isPlayingAudio 
                          ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" 
                          : "bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {isPlayingAudio ? "재생 중" : "발음 듣기"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {result ? (
              <>
                <div className="p-3.5 md:p-4 bg-violet-50/40 rounded-xl border border-violet-100/60 space-y-2.5">
                  {isTokenView ? (
                    <div>
                      <p className="text-[11px] font-medium text-violet-500 mb-2">단어를 누르거나 마우스를 올리면 뜻이 나타납니다</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2 text-slate-900 font-medium leading-relaxed">
                        {result.tokens.map((token, idx) => (
                          <div 
                            key={idx} 
                            className="relative group inline-block"
                            onClick={(e) => { e.stopPropagation(); handleTokenClick(idx); }}
                          >
                            <span className={`cursor-pointer px-2 py-1 rounded-lg border text-sm font-semibold transition-all shadow-2xs block ${
                              activeTokenIdx === idx 
                                ? "bg-violet-600 text-white border-violet-600" 
                                : "bg-white group-hover:bg-violet-600 group-hover:text-white text-slate-800 border-slate-200"
                            }`}>
                              {token.word}
                            </span>
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 ${
                              activeTokenIdx === idx ? "flex" : "hidden group-hover:flex"
                            } flex-col items-center`}>
                              <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                                <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {token.pos}
                                </span>
                                <span className="text-slate-100 font-medium">{token.meaning}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToVocab(token.word, token.meaning, token.pos);
                                  }}
                                  className="ml-1 bg-slate-700 hover:bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow-sm"
                                  title="단어장에 추가"
                                  >
                                    +
                                  </button>
                              </div>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm md:text-base text-slate-900 font-semibold leading-relaxed">
                        {result.corrected}
                      </p>
                    </div>
                  )}

                  <p className="text-xs font-medium text-violet-700/90 pt-2 border-t border-violet-200/50 flex items-center gap-1.5">
                    <span className="text-[10px] bg-violet-200/70 text-violet-800 px-1.5 py-0.5 rounded font-bold">완역</span>
                    {result.korean_translation}
                  </p>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <span className="font-semibold text-slate-700 block mb-0.5">💡 교정 뉘앙스</span>
                  {result.explanation}
                </div>

                {spokenText && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">발음 분석 결과</span>
                      {pronunciationScore !== null && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${
                          pronunciationScore >= 80 
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : pronunciationScore >= 50
                            ? "bg-amber-100 text-amber-700 border border-amber-300"
                            : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}>
                          정확도 {pronunciationScore}%
                        </span>
                      )}
                    </div>
                    
                    {pronunciationDetails && (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        {pronunciationDetails.map((item, idx) => (
                          <span 
                            key={idx} 
                            className={`text-sm md:text-base font-semibold px-1 rounded transition-colors ${
                              item.isMatched 
                                ? "text-emerald-600 bg-emerald-50" 
                                : "text-rose-500 bg-rose-50 underline decoration-rose-300 decoration-2 underline-offset-2"
                            }`}
                          >
                            {item.word}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-slate-500 flex items-start gap-1.5 bg-white p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-600 shrink-0">내 음성:</span>
                      <p className="italic">"{spokenText}"</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-44 md:h-56 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <span>좌측에 문장을 입력하고 분석 버튼을 누르면</span>
                <span>교정된 문장과 발음 트레이닝 기능이 활성화됩니다.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={handleToggleRecord}
                disabled={!result}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 ${
                  isRecording 
                    ? "bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-100" 
                    : "bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700">
                  {isRecording ? "마이크로 말하는 중..." : "내 발음 녹음하기"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isRecording ? "다 읽은 후 정지 버튼 클릭" : "버튼을 누르고 위 문장을 읽어보세요"}
                </span>
              </div>
            </div>

            {spokenText && (
              <button 
                onClick={() => { 
                  setSpokenText(""); 
                  setPronunciationScore(null); 
                  setPronunciationDetails(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
                title="녹음 초기화"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>

      </div>

      {/* 무료 사용량 모달 */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              오늘 무료 사용량을 모두 소진했습니다
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              무료 플랜은 매일 자정에 5회가 새로 충전됩니다. 무제한 교정과 심화 발음 피드백을 원하시면 프로 플랜을 이용해보세요.
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 학습 기록장 모달 */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-amber-600" />
                  내 학습 기록장
                </h3>
                <button
                  onClick={() => setIsHistoryBlindMode(!isHistoryBlindMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    isHistoryBlindMode ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {isHistoryBlindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  블라인드 {isHistoryBlindMode ? "ON" : "OFF"}
                </button>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
              {history.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <span className="text-sm">아직 저장된 학습 기록이 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 relative group transition-all duration-300 ${
                      item.isMemorized ? "bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]" : "bg-white border-slate-200"
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-medium text-slate-400">{item.date}</span>
                        {/* 암기 완료 토글 버튼 */}
                        <button 
                          onClick={() => toggleHistoryMemorized(item.id)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            item.isMemorized ? "text-emerald-500 bg-emerald-50 opacity-100" : "text-slate-300 hover:text-emerald-500 hover:bg-slate-100 md:opacity-0 group-hover:opacity-100"
                          }`}
                          title="암기 완료"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-start gap-1.5 -mt-3">
                        <span className="shrink-0 bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5">Q</span>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.originalText}</p>
                      </div>

                      <div className="flex items-start gap-1.5 mt-0.5">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 transition-colors ${
                          isHistoryBlindMode ? "bg-slate-200 text-slate-400" : "bg-violet-100 text-violet-600"
                        }`}>A</span>
                        <p className={`text-sm font-bold transition-all duration-300 flex-1 ${
                          isHistoryBlindMode ? "text-transparent bg-slate-200 rounded blur-[5px] select-none cursor-help hover:text-slate-800 hover:bg-transparent hover:blur-none" : "text-slate-800"
                        }`}>
                          {item.correctedText}
                        </p>
                        {/* 미니 TTS 버튼 */}
                        <button 
                          onClick={(e) => playText(item.correctedText, e)}
                          className="shrink-0 p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors cursor-pointer"
                          title="발음 듣기"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {!isHistoryBlindMode && (
                        <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed animate-in fade-in duration-300">
                          <span className="font-semibold text-slate-700 block mb-1">💡 뉘앙스 노트</span>
                          {item.nuance}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={clearHistory}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  기록 전체 비우기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 단어장 사이드바 */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          showVocab ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setShowVocab(false)}
      />

      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
        showVocab ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">📚</span>
              내 단어장
            </h3>
            <button
              onClick={() => setIsVocabBlindMode(!isVocabBlindMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                isVocabBlindMode ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {isVocabBlindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              블라인드 {isVocabBlindMode ? "ON" : "OFF"}
            </button>
          </div>
          <button 
            onClick={() => setShowVocab(false)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {vocab.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl">
                👀
              </div>
              <span className="text-sm">저장된 단어가 없습니다.</span>
              <span className="text-xs text-slate-400">교정 결과에서 단어를 눌러 추가해보세요!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {vocab.map((item) => (
                <div key={item.id} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 relative group transition-all duration-300 ${
                  item.isMemorized ? "bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]" : "bg-white border-slate-200"
                }`}>
                  {/* 우측 상단 버튼 그룹 (암기 완료 & 삭제) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleVocabMemorized(item.id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        item.isMemorized ? "text-emerald-500 bg-emerald-50 opacity-100" : "text-slate-300 hover:text-emerald-500 hover:bg-slate-100"
                      }`}
                      title="암기 완료"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeVocab(item.id)}
                      className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                      title="삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-medium text-slate-400">{item.date} 추가됨</span>
                  </div>
                  
                  {/* Q: 영단어 */}
                  <div className="flex items-center gap-1.5 -mt-2">
                    <span className="shrink-0 bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-bold">Q</span>
                    <h4 className={`text-lg font-bold transition-all ${item.isMemorized ? "text-slate-500 line-through" : "text-slate-800"}`}>
                      {item.word}
                    </h4>
                    {/* 미니 TTS 버튼 */}
                    <button 
                      onClick={(e) => playText(item.word, e)}
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors cursor-pointer ml-1"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* A: 뜻과 품사 */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      isVocabBlindMode ? "bg-slate-200 text-slate-400" : "bg-emerald-100 text-emerald-600"
                    }`}>A</span>
                    
                    <div className={`flex items-center gap-2 transition-all duration-300 w-fit bg-slate-50 p-2 rounded-lg border border-slate-100 ${
                      isVocabBlindMode 
                        ? "opacity-30 blur-[4px] select-none cursor-help hover:opacity-100 hover:blur-none" 
                        : ""
                    }`}>
                      <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {item.pos}
                      </span>
                      <span className={`text-sm font-medium ${item.isMemorized ? "text-slate-400" : "text-slate-700"}`}>
                        {item.meaning}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}