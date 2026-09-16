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
  Check, 
  Crown
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface HistoryItem {
  id: string;
  originalText: string;
  correctedText: string;
  koreanTranslation?: string;
  nuance: string;
  date: string;
  isMemorized?: boolean;
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
  isMemorized?: boolean;
}

const MAX_FREE_COUNT = 5;
const MAX_GUEST_COUNT = 2; 
const MAX_CHAR_LIMIT = 300;

export default function Home() {
  const router = useRouter();

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
  const [pronunciationDetails, setPronunciationDetails] = useState<{ word: string, isMatched: boolean }[] | null>(null);

  const [isHistoryBlindMode, setIsHistoryBlindMode] = useState(false);
  const [isVocabBlindMode, setIsVocabBlindMode] = useState(false);

  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const recognitionRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");
  const [isProUser, setIsProUser] = useState(false);

  const [showProModal, setShowProModal] = useState(false);
  const [isVocabEditMode, setIsVocabEditMode] = useState(false); 
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]); 
  const [showVocabDeleteModal, setShowVocabDeleteModal] = useState(false);

  // 🎯 매일 첫 학습 완료 시 칭찬 토스트를 띄우는 함수 (검증 완료)
  const checkDailyLearning = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const lastCelebrated = localStorage.getItem('last_celebrated_date');

    if (lastCelebrated !== todayStr) {
      toast.success(`${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일자 학습이 완료되었습니다! 🔥\n오늘의 첫 학습을 기록했어요.`, { 
        duration: 5000, 
        icon: '🎉' 
      });
      localStorage.setItem('last_celebrated_date', todayStr);
    }
  };

  const requireLogin = (actionName: string) => {
    if (!user) {
      toast.error(`'${actionName}' 기능은 로그인 후 이용할 수 있습니다.\n3초 만에 가입하고 모든 기능을 누려보세요!`, { duration: 4000 });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com'];
      if (ADMIN_EMAILS.includes(user.email || '')) {
        setIsProUser(true);
      }
    };
    checkAdminStatus();
  }, []);

  const toggleVocabSelection = (id: string) => {
    setSelectedVocabIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleSelectAllVocab = () => {
    if (selectedVocabIds.length === vocab.length) setSelectedVocabIds([]);
    else setSelectedVocabIds(vocab.map(v => v.id));
  };

  const handleDeleteSelectedVocab = () => {
    if (selectedVocabIds.length === 0) return;
    setShowVocabDeleteModal(true); 
  };

  const executeDeleteVocab = async () => {
    try {
      const { error } = await supabase.from("vocab").delete().in("id", selectedVocabIds);
      if (error) throw error;
      setVocab(vocab.filter(item => !selectedVocabIds.includes(item.id)));
      setSelectedVocabIds([]); 
      setIsVocabEditMode(false); 
      setShowVocabDeleteModal(false); 
      toast.success("선택한 단어가 삭제되었습니다.");
    } catch (err) {
      toast.error("단어 삭제 중 오류가 발생했습니다.");
    }
  };
  
  useEffect(() => {
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_deleted')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_deleted) {
          const isRecover = confirm("탈퇴 대기 중인 계정입니다.\n\n탈퇴를 취소하고 복구하시겠습니까?");
          if (isRecover) {
            await supabase.from('profiles').update({ is_deleted: false, deleted_at: null }).eq('id', session.user.id);
            alert("계정이 성공적으로 복구되었습니다! 🎉");
            setUser(session.user); 
          } else {
            await supabase.auth.signOut();
            router.push('/login');
          }
        } else {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
    };
    getUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (remainingCount > 0) return; 

    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();

      const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
      const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

      setTimeUntilMidnight(`${h}시간 ${m}분 ${s}초`);
    };

    calculateTimeLeft(); 
    const timer = setInterval(calculateTimeLeft, 1000); 

    return () => clearInterval(timer);
  }, [remainingCount]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; 
  };

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal); 

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const translatePOS = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes('verb')) return '동사';
    if (p.includes('noun')) return '명사';
    if (p.includes('adj')) return '형용사'; 
    if (p.includes('adv')) return '부사';  
    if (p.includes('prep')) return '전치사'; 
    if (p.includes('conj')) return '접속사'; 
    if (p.includes('pron')) return '대명사'; 
    return pos; 
  };

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

  const toggleVocabMemorized = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("vocab").update({ is_memorized: !currentStatus }).eq("id", id);
    if (!error) {
      setVocab(vocab.map(item => item.id === id ? { ...item, isMemorized: !currentStatus } : item));
    }
  };

  const toggleHistoryMemorized = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("history").update({ is_memorized: !currentStatus }).eq("id", id);
    if (!error) {
      setHistory(history.map(item => item.id === id ? { ...item, isMemorized: !currentStatus } : item));
    }
  };

  useEffect(() => {
    if (user === undefined) return; 

    const today = new Date().toLocaleDateString();

    if (user) {
      fetchVocab();
      fetchHistory();
      const savedDate = localStorage.getItem("zipil_date");
      if (savedDate === today) {
        const savedCount = localStorage.getItem("zipil_remaining_count");
        if (savedCount !== null) setRemainingCount(parseInt(savedCount, 10));
      } else {
        setRemainingCount(MAX_FREE_COUNT);
        localStorage.setItem("zipil_remaining_count", MAX_FREE_COUNT.toString());
        localStorage.setItem("zipil_date", today);
      }
    } else {
      setVocab([]);
      setHistory([]);
      const savedDate = localStorage.getItem("zipil_guest_date");
      if (savedDate === today) {
        const savedCount = localStorage.getItem("zipil_guest_count");
        if (savedCount !== null) setRemainingCount(parseInt(savedCount, 10));
      } else {
        setRemainingCount(MAX_GUEST_COUNT);
        localStorage.setItem("zipil_guest_count", MAX_GUEST_COUNT.toString());
        localStorage.setItem("zipil_guest_date", today);
      }
    }
  }, [user]);
  
  const fetchVocab = async () => {
    const { data, error } = await supabase.from("vocab").select("*").order("created_at", { ascending: false });
    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id, word: item.word, meaning: item.meaning, pos: item.pos,
        date: item.created_at ? formatDateTime(item.created_at) : formatDateTime(item.date),
        isMemorized: item.is_memorized
      }));
      setVocab(formatted);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase.from("history").select("*").order("created_at", { ascending: false });
    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id, originalText: item.original_text, correctedText: item.corrected_text,
        koreanTranslation: item.korean_translation, nuance: item.nuance, date: item.date,
        isMemorized: item.is_memorized
      }));
      setHistory(formatted);
    }
  };

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

  const handlePlayTTS = () => {
    if (!result || !("speechSynthesis" in window)) {
      alert("브라우저가 음성 재생(TTS)을 지원하지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.corrected);
    utterance.lang = "en-US";
    utterance.rate = ttsRate;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

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

  const handleAnalyze = async () => {
    const trimmed = inputText.trim();
    setErrorMessage(null);

    if (!trimmed) {
      setErrorMessage("교정할 문장을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_CHAR_LIMIT && !isProUser) {
      setErrorMessage(`최대 ${MAX_CHAR_LIMIT}자 이하로 입력해주세요.`);
      return;
    }
    
    if (!isProUser && remainingCount <= 0) {
      if (!user) return requireLogin('추가 AI 분석'); 
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
      
      // ✅ 기록장 자동 저장 및 자정 토스트 호출 완벽 검증
      if (user) {
        saveToHistory(trimmed, data.corrected, data.korean_translation, data.explanation);
        checkDailyLearning(); 
      }

      const newCount = remainingCount - 1;
      setRemainingCount(newCount);
      if (user) {
        localStorage.setItem("zipil_remaining_count", newCount.toString());
      } else {
        localStorage.setItem("zipil_guest_count", newCount.toString());
      }

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
    if (savedHistory && user) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [user]);

  const saveToHistory = async (original: string, corrected: string, koreanTranslation: string, nuance: string) => {
    const dateStr = formatDateTime(new Date());

    const { data, error } = await supabase
      .from("history")
      .insert([{
        original_text: original,
        corrected_text: corrected,
        korean_translation: koreanTranslation,
        nuance: nuance,
        date: dateStr,
        is_memorized: false
      }])
      .select(); 

    if (data && !error) {
      const newItem: HistoryItem = {
        id: data[0].id,
        originalText: data[0].original_text,
        correctedText: data[0].corrected_text,
        koreanTranslation: data[0].korean_translation,
        nuance: data[0].nuance,
        date: data[0].date,
        isMemorized: data[0].is_memorized
      };
      setHistory([newItem, ...history]); 
    }
  };

  const clearHistory = async () => {
    if (confirm('모든 학습 기록을 삭제하시겠습니까?')) {
      const { error } = await supabase.from("history").delete().not("id", "is", null);
      if (!error) {
        setHistory([]);
      }
    }
  };

  useEffect(() => {
    const savedVocab = localStorage.getItem('zipil_vocab');
    if (savedVocab && user) {
      setVocab(JSON.parse(savedVocab));
    }
  }, [user]);

  const addToVocab = async (word: string, meaning: string, pos: string) => {
    if (!requireLogin('단어 저장')) return;

    if (vocab.some(v => v.word.toLowerCase() === word.toLowerCase())) {
      toast.error("이미 단어장에 저장된 단어입니다."); 
      return;
    }

    const dateStr = formatDateTime(new Date());
    const koreanPos = translatePOS(pos);

    try {
      const { data, error } = await supabase
        .from("vocab")
        .insert([{
          word: word,
          meaning: meaning,
          pos: koreanPos,
          date: dateStr,
          is_memorized: false
        }])
        .select();

      if (error) {
        console.error("단어 추가 에러:", error);
        alert(`DB 에러: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const newItem: VocabItem = {
          id: data[0].id,
          word: data[0].word,
          meaning: data[0].meaning,
          pos: data[0].pos,
          date: data[0].date,
          isMemorized: data[0].is_memorized
        };
        setVocab([newItem, ...vocab]);
        toast.success(`'${word}' 단어가 저장되었습니다!`);
        // ✅ 단어장 추가 시 자정 토스트 호출 완벽 검증
        checkDailyLearning();
      }
    } catch (err) {
      console.error("통신 에러:", err);
      toast.error("서버와 통신하는 중 문제가 발생했습니다.");
    }
  };

  const removeVocab = async (id: string) => {
    const { error } = await supabase.from("vocab").delete().eq("id", id);
    if (!error) {
      setVocab(vocab.filter(item => item.id !== id));
    }
  };

  return (
    <main
      className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center px-4 py-6 md:p-12 relative"
      onClick={() => setActiveTokenIdx(null)}
    >
      <header className="w-full max-w-5xl flex items-center justify-between py-3 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          
          <div className="flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full px-3.5 py-1.5 shrink-0 cursor-default">
            <span className="font-black text-slate-800 text-sm tracking-[0.2em] flex items-center gap-2 whitespace-nowrap pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              ㅈㅍㅈ
            </span>
          </div>

          <span className="text-slate-300 font-light text-lg hidden sm:block mb-0.5">/</span>

          <h1 className="text-sm font-semibold text-slate-500 tracking-tight hidden sm:block">
            AI 영작 & 인터랙티브 발음 교정 워크스페이스
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if(requireLogin('단어장')) setShowVocab(true); }}
            className="text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>단어장</span>
            {user && vocab.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full">
                {vocab.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { if(requireLogin('학습 기록장')) setShowHistory(true); }}
            className="text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer">
            <span>기록장</span>
            {user && history.length > 0 && (
              <span className="bg-slate-800 text-white text-[10px] px-1.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
          
          {isProUser ? (
            <button
              onClick={() => setShowProModal(true)}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
              title="나의 PRO 혜택 보기"
            >
              <Crown className="w-3.5 h-3.5" />
              PRO
            </button>
          ) : (
            <span className={`text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border transition-colors ${remainingCount > 0
              ? "bg-violet-100 text-violet-700 border-violet-200"
              : "bg-rose-100 text-rose-700 border-rose-200 animate-pulse"
              }`}>
              {user ? `오늘 무료 ${remainingCount}/${MAX_FREE_COUNT}` : `비회원 체험 ${remainingCount}/${MAX_GUEST_COUNT}`}
            </span>
          )}

          {user && !isProUser && (
            <button
              onClick={() => setShowProModal(true)}
              className="hidden md:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              PRO 업그레이드
            </button>
          )}
          <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block"></div>

          {user ? (
            <Link href="/mypage" className="flex items-center gap-2 bg-white p-1 pr-3 rounded-full border border-slate-200 hover:border-violet-300 hover:ring-2 hover:ring-violet-100 transition-all shadow-sm shrink-0 cursor-pointer group">
              <img
                src={user.user_metadata.custom_avatar || user.user_metadata.avatar_url}
                alt="프로필"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-slate-100"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col hidden sm:flex text-left">
                <span className="text-[10px] md:text-xs font-bold text-slate-700 leading-none mb-0.5 max-w-[80px] truncate group-hover:text-violet-700 transition-colors">
                  {user.user_metadata.display_name || user.user_metadata.full_name}
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-medium leading-none">
                  마이페이지
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 md:px-4 md:py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              로그인
            </Link>
          )}
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">

        {/* 👇 통계, 퀴즈 페이지와 완벽하게 일치하는 둥근 모서리(rounded-3xl)와 부드러운 그림자(shadow-sm) 적용 */}
        <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[380px] md:min-h-[600px]">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-amber-600" />
                작성할 문장 (한글 또는 영문)
              </label>
              
              <div className="flex items-center gap-3">
                {inputText.length > 0 && (
                  <button
                    onClick={() => setInputText("")}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="입력 내용 전체 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                    지우기
                  </button>
                )}
                
                <span className={`text-xs ${inputText.length > (isProUser ? 3000 : 300) ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                  {inputText.length}/{isProUser ? 3000 : 300}자
                </span>
              </div>
            </div>

            {/* 👇 입력창 포커스 시 테두리를 시그니처 컬러인 보라색(Violet)으로 통일 */}
            <textarea
              className={`w-full h-48 md:h-80 p-3.5 md:p-5 rounded-2xl border focus:outline-hidden focus:ring-2 resize-none text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 bg-slate-50/50 transition-all ${inputText.length > (isProUser ? 3000 : 300)
                ? "border-rose-300 focus:ring-rose-200"
                : "border-slate-200 focus:ring-violet-200 focus:border-violet-400"
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

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim() || inputText.length > (isProUser ? 3000 : 300) || (!isProUser && remainingCount === 0)}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] ${
                !isProUser && remainingCount === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  // 👇 분석 버튼을 한층 더 고급스러운 보라색(Violet) 스타일로 업그레이드
                  : "bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white cursor-pointer disabled:cursor-not-allowed shadow-md shadow-violet-200"
              }`}
            >
              {!isProUser && remainingCount === 0 ? (
                user ? `⏳ 자정 충전까지 ${timeUntilMidnight}` : "🔒 로그인하고 계속하기"
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-violet-200" />
                  AI 분석 및 교정 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-violet-100" />
                  AI 문장 교정 & 분석하기
                </>
              )}
            </button>

            {!isProUser && remainingCount === 0 && (
              <p className="text-center text-xs text-slate-500 font-medium animate-pulse mt-1">
                {user ? (
                  <>오늘 무료 분석을 모두 사용했습니다. 상단의 <span className="font-bold text-violet-600">내 학습 기록장</span>에서 복습해 보세요!</>
                ) : (
                  <>비회원 체험이 끝났습니다. <Link href="/login" className="font-bold text-violet-600 hover:underline">가입하고 매일 무료</Link>로 즐겨보세요!</>
                )}
              </p>
            )}
          </div>
        </section>

        {/* 👇 결과 컨테이너 역시 rounded-3xl, shadow-sm 통일 */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[380px] md:min-h-[480px]">
          <div className="space-y-3.5">
            <div className="flex items-center justify-end border-b border-slate-100 pb-3 min-h-[44px]">
              <div className="flex items-center gap-1.5 md:gap-2">
                {result && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsTokenView(!isTokenView); }}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
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

                    <select
                      value={ttsRate}
                      onChange={(e) => setTtsRate(Number(e.target.value))}
                      disabled={isPlayingAudio}
                      className="text-xs font-semibold px-1.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer hover:bg-slate-100 transition-colors disabled:opacity-50"
                      title="재생 속도 선택"
                    >
                      <option value={1.0}>1.0x (기본)</option>
                      <option value={0.75}>0.75x</option>
                      <option value={0.5}>0.5x</option>
                    </select>

                    <button
                      onClick={handlePlayTTS}
                      disabled={isPlayingAudio}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all active:scale-95 whitespace-nowrap ${isPlayingAudio
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
                <div className="p-3.5 md:p-4 bg-violet-50/40 rounded-2xl border border-violet-100/60 space-y-2.5">
                  <p className="text-xs font-medium text-violet-700/90 pb-3 mb-3 border-b border-violet-200/50 flex items-center gap-1.5">
                    <span className="text-[10px] bg-violet-200/70 text-violet-800 px-1.5 py-0.5 rounded font-bold">완역</span>
                    {result.korean_translation}
                  </p>

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
                            {/* 👇 1. 클릭된 상태일 때는 다른 단어의 Hover 색상 변화 차단 */}
                            <span className={`cursor-pointer px-2 py-1 rounded-lg border text-sm font-semibold transition-all shadow-sm block ${
                              activeTokenIdx !== null
                                ? (activeTokenIdx === idx ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-800 border-slate-200")
                                : "bg-white group-hover:bg-violet-600 group-hover:text-white text-slate-800 border-slate-200"
                              }`}>
                              {token.word}
                            </span>
                            
                            {/* 👇 2. 클릭된 상태일 때는 다른 단어의 Hover 툴팁 팝업 차단 */}
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 flex-col items-center ${
                              activeTokenIdx !== null 
                                ? (activeTokenIdx === idx ? "flex" : "hidden") 
                                : "hidden group-hover:flex"
                              }`}>
                              <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                                <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {translatePOS(token.pos)}
                                </span>
                                <span className="text-slate-100 font-medium">{token.meaning}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToVocab(token.word, token.meaning, token.pos);
                                  }}
                                  className="ml-1 bg-slate-700 hover:bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
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
                </div>

                {/* 👇 뉘앙스 박스 디자인 개선 (보라색 계열로 고급스럽게) */}
                <div className="text-xs text-violet-800 bg-violet-50/50 p-4 rounded-2xl border border-violet-100 leading-relaxed shadow-sm">
                  <span className="font-bold text-violet-900 flex items-center gap-1.5 mb-1.5">
                    💡 교정 뉘앙스
                  </span>
                  <span className="text-slate-600 font-medium">{result.explanation}</span>
                </div>

                {spokenText && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">발음 분석 결과</span>
                      {pronunciationScore !== null && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${pronunciationScore >= 80
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
                            className={`text-sm md:text-base font-semibold px-1 rounded transition-colors ${item.isMatched
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
              <div className="h-44 md:h-56 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                <span className="font-medium">좌측에 문장을 입력하고 분석 버튼을 누르면</span>
                <span className="font-medium">교정된 문장과 발음 트레이닝 기능이 활성화됩니다.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleToggleRecord}
                disabled={!result}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 ${isRecording
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${isHistoryBlindMode ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
                  {history.map((item) => {
                    const cleanOriginal = item.originalText.toLowerCase().replace(/[^a-z]/g, '');
                    const cleanCorrected = item.correctedText.toLowerCase().replace(/[^a-z]/g, '');
                    const isPerfectEnglish = cleanOriginal === cleanCorrected && cleanOriginal.length > 0;
                    const isKoreanInput = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(item.originalText);

                    return (
                      <div key={item.id} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 relative group transition-all duration-300 ${item.isMemorized ? "bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]" : "bg-white border-slate-200"
                        }`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-medium text-slate-400">{item.date}</span>
                          <button
                            onClick={() => toggleHistoryMemorized(item.id, item.isMemorized || false)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${item.isMemorized ? "text-emerald-500 bg-emerald-50 opacity-100" : "text-slate-300 hover:text-emerald-500 hover:bg-slate-100 md:opacity-0 group-hover:opacity-100"
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
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 transition-colors ${isHistoryBlindMode ? "bg-slate-200 text-slate-400" : "bg-violet-100 text-violet-600"
                            }`}>A</span>

                          <div className="flex-1 flex flex-col">
                            {isPerfectEnglish ? (
                              <p className={`text-sm font-bold transition-all duration-300 ${isHistoryBlindMode ? "text-transparent bg-slate-200 rounded blur-[5px] select-none cursor-help hover:text-slate-800 hover:bg-transparent hover:blur-none" : "text-slate-800"
                                }`}>
                                {item.koreanTranslation || item.correctedText}
                              </p>
                            ) : (
                              <>
                                <p className={`text-sm font-bold transition-all duration-300 ${isHistoryBlindMode ? "text-transparent bg-slate-200 rounded blur-[5px] select-none cursor-help hover:text-slate-800 hover:bg-transparent hover:blur-none" : "text-slate-800"
                                  }`}>
                                  {item.correctedText}
                                </p>
                                {!isKoreanInput && item.koreanTranslation && (
                                  <p className={`text-[11px] mt-0.5 font-medium transition-all duration-300 ${isHistoryBlindMode ? "text-transparent bg-slate-200 rounded blur-[4px] select-none cursor-help hover:text-slate-600 hover:bg-transparent hover:blur-none" : "text-violet-600/80"
                                    }`}>
                                    {item.koreanTranslation}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

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
                    );
                  })}
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
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${showVocab ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={() => setShowVocab(false)}
      />

      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${showVocab ? "translate-x-0" : "translate-x-full"
        }`}>
        <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">📚</span>
              내 단어장
            </h3>
            {vocab.length > 0 && (
              <button
                onClick={() => {
                  setIsVocabEditMode(!isVocabEditMode);
                  setSelectedVocabIds([]);
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  isVocabEditMode ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isVocabEditMode ? '완료' : '편집'}
              </button>
            )}
            {!isVocabEditMode && (
            <button
              onClick={() => setIsVocabBlindMode(!isVocabBlindMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${isVocabBlindMode ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
            >
              {isVocabBlindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              블라인드 {isVocabBlindMode ? "ON" : "OFF"}
            </button>
            )}
          </div>
          <button
            onClick={() => setShowVocab(false)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 relative pb-20">
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
                <div 
                  key={item.id} 
                  onClick={() => isVocabEditMode && toggleVocabSelection(item.id)}
                  className={`group p-4 rounded-xl border shadow-sm flex relative transition-all duration-300 ${
                    item.isMemorized && !isVocabEditMode ? "bg-slate-100 border-slate-200 opacity-60 grayscale-[50%]" : "bg-white border-slate-200"
                  } ${isVocabEditMode ? "cursor-pointer hover:border-violet-300" : ""}`}
                >
                  
                  {isVocabEditMode && (
                    <div className="flex items-center justify-center mr-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        selectedVocabIds.includes(item.id) ? "bg-violet-600 border-violet-600" : "bg-white border-slate-300"
                      }`}>
                        {selectedVocabIds.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    {!isVocabEditMode && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVocabMemorized(item.id, item.isMemorized || false); }}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${item.isMemorized ? "text-emerald-500 bg-emerald-50 opacity-100" : "text-slate-300 hover:text-emerald-500 hover:bg-slate-100"}`}
                          title="암기 완료"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeVocab(item.id); }}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] font-medium text-slate-400">{item.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="shrink-0 bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-bold">Q</span>
                      <h4 className={`text-lg font-bold transition-all ${item.isMemorized && !isVocabEditMode ? "text-slate-500 line-through" : "text-slate-800"}`}>
                        {item.word}
                      </h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); playText(item.word, e); }}
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors cursor-pointer ml-1"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${isVocabBlindMode && !isVocabEditMode ? "bg-slate-200 text-slate-400" : "bg-emerald-100 text-emerald-600"}`}>A</span>

                      <div className={`flex items-center gap-2 transition-all duration-300 w-fit bg-slate-50 p-2 rounded-lg border border-slate-100 ${isVocabBlindMode && !isVocabEditMode ? "opacity-30 blur-[4px] select-none cursor-help hover:opacity-100 hover:blur-none" : ""}`}>
                        <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {item.pos}
                        </span>
                        <span className={`text-sm font-medium ${item.isMemorized && !isVocabEditMode ? "text-slate-400" : "text-slate-700"}`}>
                          {item.meaning}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isVocabEditMode && vocab.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-5">
            <button 
              onClick={handleSelectAllVocab}
              className="text-sm font-bold text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {selectedVocabIds.length === vocab.length ? "전체 해제" : "전체 선택"}
            </button>
            <button 
              onClick={handleDeleteSelectedVocab}
              disabled={selectedVocabIds.length === 0}
              className="text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              삭제 ({selectedVocabIds.length})
            </button>
          </div>
        )}
      </div>

      {showProModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-3xl -z-10" />

            <button
              onClick={() => setShowProModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full p-1 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mt-2 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-violet-200">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-1.5">
                Zipil PRO
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isProUser ? "회원님은 현재 아래의 모든 혜택을 누리고 있습니다!" : "더 강력한 AI 기능으로 영작 마스터가 되세요"}
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { icon: '✨', text: '하루 5회 제한 없는 무제한 AI 영작 교정' },
                { icon: '🧠', text: '내 약점을 파고드는 AI 맞춤형 심화 퀴즈' },
                { icon: '🎙️', text: '원어민 수준의 정밀 발음 분석 및 피드백' },
                { icon: '📥', text: '학습 기록장 및 단어장 PDF 리포트 추출' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-lg shrink-0">{feature.icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="text-center mb-4">
              {isProUser ? (
                <button
                  onClick={() => setShowProModal(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  확인 (혜택 이용 중)
                </button>
              ) : (
                <>
                  <div className="flex items-end justify-center gap-1 mb-3">
                    <span className="text-3xl font-extrabold text-slate-900">₩9,900</span>
                    <span className="text-sm font-medium text-slate-500 mb-1">/ 월</span>
                  </div>
                  <button
                    onClick={() => {
                      toast.success("현재는 베타 서비스 기간으로 모든 기능이 무료로 제공됩니다! 🎉", { duration: 4000 });
                      setShowProModal(false);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    PRO 플랜 7일 무료 체험하기
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-3">
                    언제든지 취소할 수 있습니다.
                  </p>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}

      {showVocabDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              선택한 단어를 삭제하시겠습니까?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              <span className="font-bold text-rose-600">{selectedVocabIds.length}개</span>의 단어가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVocabDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={executeDeleteVocab}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}