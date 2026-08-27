"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Volume2, 
  Mic, 
  CheckCircle2, 
  PenTool,
  Loader2
} from "lucide-react";

interface Token {
  word: string;
  pos: string;
  meaning: string;
}

interface AnalysisResult {
  corrected: string;
  explanation: string;
  tokens: Token[];
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim() || loading) return;

    setLoading(true);
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
      {/* 1. 헤더 */}
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

      {/* 2. 메인 워크스페이스 */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 좌측: 문장 입력 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-[440px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-amber-600" />
                작성할 문장 (한글 또는 영문)
              </label>
              <span className="text-xs text-slate-400">{inputText.length}자</span>
            </div>

            <textarea
              className="w-full h-56 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent resize-none text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 bg-slate-50/50"
              placeholder="영어로 표현하고 싶은 문장(예: 이번 프로젝트 너희 팀이랑 같이 하게 돼서 기대돼)을 적어보세요..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
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

        {/* 우측: 결과 카드 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-[440px]">
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                원어민 교정 문장
              </h2>
              {result && (
                <button className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors bg-violet-50 px-2.5 py-1 rounded-lg">
                  <Volume2 className="w-3.5 h-3.5" />
                  원어민 발음 듣기
                </button>
              )}
            </div>

            {result ? (
              <>
                {/* 단어 툴팁 칩 */}
                <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100/60">
                  <p className="text-xs font-medium text-violet-500 mb-2">단어를 마우스로 올려 뜻을 확인하세요</p>
                  <div className="flex flex-wrap gap-1.5 text-slate-900 font-medium leading-relaxed">
                    {result.tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className="cursor-pointer px-1.5 py-0.5 rounded bg-white hover:bg-violet-200/80 text-slate-800 border border-slate-200/60 transition-colors"
                        title={`[${token.pos}] ${token.meaning}`}
                      >
                        {token.word}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 교정 설명 */}
                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">💡 교정 뉘앙스</span>
                  {result.explanation}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>좌측에 문장을 입력하고 분석 버튼을 누르면</span>
                <span>교정된 문장과 단어 분석이 이곳에 표시됩니다.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                disabled={!result}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Mic className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">내 목소리 녹음 후 원어민과 비교</span>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {result ? "발음 녹음 준비 완료" : "문장 분석 대기중"}
            </span>
          </div>
        </section>

      </div>
    </main>
  );
}