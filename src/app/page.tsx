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
  X
} from "lucide-react";

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

const MAX_FREE_COUNT = 5;

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // 뷰 모드 토글 (false: 일반 텍스트 뷰 / true: 인터랙티브 단어 분해 뷰)
  const [isTokenView, setIsTokenView] = useState(false);

  // 무료 사용량 상태
  const [remainingCount, setRemainingCount] = useState<number>(MAX_FREE_COUNT);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // 음성 관련 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  // 1. 일일 무료 사용량 로컬스토리지 초기화 및 날짜 체크
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("zipil_usage_date");
      const savedCount = localStorage.getItem("zipil_remaining_count");

      if (savedDate !== today) {
        // 날짜가 바뀌었으면 5회로 리셋
        localStorage.setItem("zipil_usage_date", today);
        localStorage.setItem("zipil_remaining_count", MAX_FREE_COUNT.toString());
        setRemainingCount(MAX_FREE_COUNT);
      } else if (savedCount !== null) {
        setRemainingCount(parseInt(savedCount, 10));
      }
    }
  }, []);

  // 2. Web Speech API (STT: 음성 인식) 초기화
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

    const cleanTarget = result.corrected.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    const cleanSpoken = userSpeech.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);

    let matchCount = 0;
    cleanSpoken.forEach((word) => {
      if (cleanTarget.includes(word)) {
        matchCount++;
      }
    });

    const calculated = Math.round((matchCount / Math.max(cleanTarget.length, 1)) * 100);
    setPronunciationScore(Math.min(calculated, 100));
  };

  // 4. TTS: 원어민 발음 듣기 실행
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
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Recording start error:", err);
      }
    }
  };

  // 6. AI 문장 분석 호출 (무료 횟수 차감 연동)
  const handleAnalyze = async () => {
    if (!inputText.trim() || loading) return;

    if (remainingCount <= 0) {
      setShowLimitModal(true);
      return;
    }

    setLoading(true);
    setSpokenText("");
    setPronunciationScore(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) throw new Error("분석 요청 실패");

      const data = await res.json();
      setResult(data);

      // 사용량 1회 차감 및 로컬스토리지 저장
      const newCount = remainingCount - 1;
      setRemainingCount(newCount);
      localStorage.setItem("zipil_remaining_count", newCount.toString());

    } catch (err) {
      alert("문장 분석 중 오류가 발생했습니다. API 키 및 잔액을 확인해주세요.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center p-6 md:p-12 relative">
      {/* 헤더 */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
            <span className="font-bold text-amber-800 text-lg tracking-wider">ㅈㅍㅈ</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">집필중 (Zipil)</h1>
            <p className="text-xs text-slate-500">AI 영작 & 인터랙티브 발음 교정 워크스페이스</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            remainingCount > 0 
              ? "bg-violet-100 text-violet-700 border-violet-200"
              : "bg-rose-100 text-rose-700 border-rose-200 animate-pulse"
          }`}>
            오늘 무료 {remainingCount}/{MAX_FREE_COUNT}
          </span>
        </div>
      </header>

      {/* 워크스페이스 */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 좌측: 문장 입력 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-amber-600" />
                작성할 문장 (한글 또는 영문)
              </label>
              <span className="text-xs text-slate-400">{inputText.length}자</span>
            </div>

            <textarea
              className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent resize-none text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 bg-slate-50/50"
              placeholder="영어로 표현하고 싶은 문장이나 교정받고 싶은 영어를 입력하세요..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed mt-4"
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

        {/* 우측: 분석 및 발음 트레이닝 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            {/* 상단 컨트롤러 (제목, 뷰 스위치, 발음 듣기 버튼) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                원어민 교정 결과
              </h2>

              <div className="flex items-center gap-2">
                {result && (
                  <>
                    {/* 토큰 뷰 토글 스위치 */}
                    <button
                      onClick={() => setIsTokenView(!isTokenView)}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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

                    {/* 발음 듣기 버튼 */}
                    <button 
                      onClick={handlePlayTTS}
                      disabled={isPlayingAudio}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        isPlayingAudio 
                          ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" 
                          : "bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {isPlayingAudio ? "재생 중..." : "발음 듣기"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {result ? (
              <>
                {/* 교정 문장 카드 (토글에 따라 일반 텍스트 뷰 또는 인터랙티브 토큰 뷰 렌더링) */}
                <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100/60 space-y-3">
                  {isTokenView ? (
                    /* 인터랙티브 토큰 뷰 (커스텀 팝오버 호버) */
                    <div>
                      <p className="text-[11px] font-medium text-violet-500 mb-2">단어에 마우스를 올리면 품사와 뜻이 나타납니다</p>
                      <div className="flex flex-wrap gap-2 text-slate-900 font-medium leading-relaxed">
                        {result.tokens.map((token, idx) => (
                          <div key={idx} className="relative group inline-block">
                            {/* 단어 칩 */}
                            <span className="cursor-pointer px-2.5 py-1 rounded-lg bg-white group-hover:bg-violet-600 group-hover:text-white text-slate-800 border border-slate-200 text-sm font-semibold transition-all shadow-xs block">
                              {token.word}
                            </span>

                            {/* 커스텀 팝오버 툴팁 카드 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                              <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                                <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {token.pos}
                                </span>
                                <span className="text-slate-100 font-medium">{token.meaning}</span>
                              </div>
                              {/* 툴팁 아래 화살표 */}
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 일반 텍스트 뷰 (기본) */
                    <div>
                      <p className="text-sm text-slate-900 font-semibold leading-relaxed">
                        {result.corrected}
                      </p>
                    </div>
                  )}

                  {/* 한국어 완역 표시 */}
                  <p className="text-xs font-medium text-violet-700/90 pt-2 border-t border-violet-200/50 flex items-center gap-1.5">
                    <span className="text-[11px] bg-violet-200/70 text-violet-800 px-1.5 py-0.5 rounded font-bold">완역</span>
                    {result.korean_translation}
                  </p>
                </div>

                {/* 교정 설명 */}
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <span className="font-semibold text-slate-700 block mb-0.5">💡 교정 뉘앙스</span>
                  {result.explanation}
                </div>

                {/* 발음 인식 결과 피드백 카드 */}
                {spokenText && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">내 발음 인식 결과</span>
                      {pronunciationScore !== null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          pronunciationScore >= 80 
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : pronunciationScore >= 50
                            ? "bg-amber-100 text-amber-700 border border-amber-300"
                            : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}>
                          일치율 {pronunciationScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 italic bg-white p-2 rounded border border-slate-100">
                      "{spokenText}"
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <span>좌측에 문장을 입력하고 분석 버튼을 누르면</span>
                <span>교정된 문장과 발음 트레이닝 기능이 활성화됩니다.</span>
              </div>
            )}
          </div>

          {/* 발음 녹음 컨트롤러 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={handleToggleRecord}
                disabled={!result}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed ${
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
                  {isRecording ? "다 읽은 후 버튼을 눌러 정지" : "버튼을 누르고 위 문장을 읽어보세요"}
                </span>
              </div>
            </div>

            {spokenText && (
              <button 
                onClick={() => { setSpokenText(""); setPronunciationScore(null); }}
                className="text-slate-400 hover:text-slate-600 p-1.5"
                title="녹음 초기화"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>

      </div>

      {/* 무료 사용량 소진 시 팝업 모달 */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
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
    </main>
  );
}