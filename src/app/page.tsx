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
  RefreshCw
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

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // 음성 관련 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  // 1. Web Speech API (STT: 음성 인식) 초기화
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

  // 2. 발음 일치도 점수 계산 로직
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

  // 3. TTS: 원어민 발음 듣기 실행
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

  // 4. STT: 녹음 토글
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

  // 5. AI 문장 분석 호출
  const handleAnalyze = async () => {
    if (!inputText.trim() || loading) return;

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
    } catch (err) {
      alert("문장 분석 중 오류가 발생했습니다. API 키 및 잔액을 확인해주세요.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center p-6 md:p-12">
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
            오늘 무료 5/5
          </span>
        </div>
      </header>

      {/* 워크스페이스 */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 좌측: 문장 입력 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[460px]">
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
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[460px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                원어민 교정 문장
              </h2>
              {result && (
                <button 
                  onClick={handlePlayTTS}
                  disabled={isPlayingAudio}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    isPlayingAudio 
                      ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" 
                      : "bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {isPlayingAudio ? "재생 중..." : "원어민 발음 듣기"}
                </button>
              )}
            </div>

            {result ? (
              <>
                {/* 단어 툴팁 칩 및 한국어 해석 영역 */}
                <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100/60 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5 text-slate-900 font-medium leading-relaxed">
                    {result.tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className="cursor-pointer px-2 py-0.5 rounded bg-white hover:bg-violet-200 text-slate-800 border border-slate-200/80 text-sm transition-colors shadow-2xs"
                        title={`[${token.pos}] ${token.meaning}`}
                      >
                        {token.word}
                      </span>
                    ))}
                  </div>

                  {/* 한국어 완역 표시 */}
                  <p className="text-xs font-medium text-violet-700/90 pt-1 border-t border-violet-200/50">
                    🇰🇷 {result.korean_translation}
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
    </main>
  );
}