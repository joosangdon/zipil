"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Bookmark, RotateCcw, Gamepad2, Brain, Mic, Timer, Lock, Crown, ChevronRight, X, ChevronLeft, Send, CheckCircle2, XCircle, Volume2, Eye, ArrowRight, Lightbulb, Loader2, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const DEFAULT_WORDS = [
  { word: "consistency", meaning: "일관성", pos: "명사" },
  { word: "significant", meaning: "중요한, 상당한", pos: "형용사" },
  { word: "implement", meaning: "구현하다, 실행하다", pos: "동사" },
  { word: "evaluate", meaning: "평가하다", pos: "동사" },
  { word: "comprehensive", meaning: "포괄적인, 종합적인", pos: "형용사" },
  { word: "determine", meaning: "결정하다, 알아내다", pos: "동사" },
  { word: "crucial", meaning: "중대한, 결정적인", pos: "형용사" },
  { word: "analyze", meaning: "분석하다", pos: "동사" },
  { word: "sustainability", meaning: "지속 가능성", pos: "명사" },
  { word: "innovative", meaning: "혁신적인", pos: "형용사" },
  { word: "facilitate", meaning: "촉진하다, 용이하게 하다", pos: "동사" },
  { word: "subsequent", meaning: "그 다음의, 차후의", pos: "형용사" },
  { word: "vulnerable", meaning: "취약한", pos: "형용사" },
  { word: "optimize", meaning: "최적화하다", pos: "동사" },
  { word: "infrastructure", meaning: "기반 시설", pos: "명사" },
  { word: "collaborate", meaning: "협력하다", pos: "동사" },
  { word: "mandatory", meaning: "의무적인", pos: "형용사" },
  { word: "integrate", meaning: "통합하다", pos: "동사" },
  { word: "resilient", meaning: "회복력 있는, 탄력 있는", pos: "형용사" },
  { word: "perspective", meaning: "관점, 시각", pos: "명사" },
  { word: "ambiguous", meaning: "애매한, 모호한", pos: "형용사" },
  { word: "allocate", meaning: "할당하다", pos: "동사" },
  { word: "revenue", meaning: "수익, 매출", pos: "명사" },
  { word: "alternative", meaning: "대안", pos: "명사" },
  { word: "exceed", meaning: "초과하다", pos: "동사" },
];

const FALLBACK_SENTENCES: Record<string, { en: string, ko: string }> = {
  "consistency": { en: "We need to maintain consistency in our design.", ko: "우리는 디자인에서 일관성을 유지해야 합니다." },
  "significant": { en: "There is a significant difference between the two.", ko: "두 가지 사이에는 상당한 차이가 있습니다." },
  "implement": { en: "We plan to implement the new system next week.", ko: "우리는 다음 주에 새 시스템을 도입할 계획입니다." },
  "evaluate": { en: "The manager will evaluate your performance.", ko: "매니저가 당신의 성과를 평가할 것입니다." },
  "comprehensive": { en: "This is a comprehensive guide to React.", ko: "이것은 리액트에 대한 포괄적인 가이드입니다." },
  "determine": { en: "It is hard to determine the exact cause.", ko: "정확한 원인을 알아내기 어렵습니다." },
  "crucial": { en: "Time management is crucial for success.", ko: "시간 관리는 성공을 위해 결정적입니다." },
  "analyze": { en: "We must analyze the data carefully.", ko: "우리는 데이터를 주의 깊게 분석해야 합니다." },
};

const SPEAKING_EPISODES = [
  {
    id: 'movie',
    title: '🎬 주말 영화관람',
    description: '친구와 영화 장르를 고르고 팝콘을 주문해보세요.',
    level: '초급',
    firstLine: "Hey! Do you want to watch a movie today? What kind of movies do you like?",
    firstLineKo: "안녕! 오늘 영화 볼래? 어떤 종류의 영화를 좋아해?"
  },
  {
    id: 'airport',
    title: '✈️ 입국 심사대',
    description: '입국 심사관의 질문에 답하고 무사히 통과하세요.',
    level: '초급',
    firstLine: "Next in line, please. What is the purpose of your visit?",
    firstLineKo: "다음 분 오세요. 방문 목적이 무엇입니까?"
  },
  {
    id: 'scrum',
    title: '💻 IT 데일리 스크럼',
    description: '어제 한 일과 오늘 할 일, 이슈를 팀원과 공유하세요.',
    level: '중급',
    firstLine: "Good morning! Let's start our daily scrum. What did you work on yesterday?",
    firstLineKo: "좋은 아침입니다! 데일리 스크럼을 시작하죠. 어제는 어떤 작업을 하셨나요?"
  },
];

// 👇 정답을 배열(Array) 형태로 변경하여 다양한 표현(복수 정답) 허용
const TIME_ATTACK_QUESTIONS = [
  { ko: "나 방금 일어났어", answers: ["I just woke up", "I woke up just now"] },
  { ko: "지금 몇 시야?", answers: ["What time is it", "What time is it now", "Do you have the time"] },
  { ko: "나 배고파", answers: ["I am hungry", "I'm hungry"] },
  { ko: "완전 피곤해", answers: ["I am so tired", "I'm so tired", "I am completely tired"] },
  { ko: "이거 얼마예요?", answers: ["How much is this", "How much is it"] },
  { ko: "도와주실 수 있나요?", answers: ["Can you help me", "Could you help me", "Can you give me a hand"] },
  { ko: "나 좀 늦을 것 같아", answers: ["I might be late", "I think I will be late", "I'll be late"] },
  { ko: "내일 봐!", answers: ["See you tomorrow", "Catch you tomorrow"] },
  { ko: "신경 쓰지 마", answers: ["Never mind", "Don't worry about it", "Forget it"] },
  { ko: "무슨 일이야?", answers: ["What's wrong", "What is wrong", "What happened", "What's the matter"] },
];

// 정규식은 컴포넌트 밖이 맞습니다.
const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export default function QuizPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'dashboard' | 'word-quiz' | 'weakness-quiz' | 'speaking-quiz' | 'timeattack'>('dashboard');
  const [showProModal, setShowProModal] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);
      const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com'];
      if (ADMIN_EMAILS.includes(user.email || '')) {
        setIsProUser(true);
      }
    };
    checkUserStatus();
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const [typingInput, setTypingInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHint, setShowHint] = useState(false);
  const [isHintUsed, setIsHintUsed] = useState(false);
  const [isTypingError, setIsTypingError] = useState(false);
  const [isTypingCompleted, setIsTypingCompleted] = useState(false);

  // 스피킹 퀴즈 전용 상태
  const [selectedEpisode, setSelectedEpisode] = useState<typeof SPEAKING_EPISODES[0] | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user', text: string, translation?: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [chatHints, setChatHints] = useState<{ type: string, text: string, translation: string }[] | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isEpisodeCleared, setIsEpisodeCleared] = useState(false);

  const [isChatRecording, setIsChatRecording] = useState(false);
  const chatRecognitionRef = useRef<any>(null);

  // 👇 밖으로 튀어나갔던 타임어택 상태들을 무사히 컴포넌트 안으로 구조출했습니다!
  const [isTaPlaying, setIsTaPlaying] = useState(false);
  const [taTimeLeft, setTaTimeLeft] = useState(60);
  const [taScore, setTaScore] = useState(0);
  const [taQuestions, setTaQuestions] = useState<typeof TIME_ATTACK_QUESTIONS>([]);
  const [taCurrentIdx, setTaCurrentIdx] = useState(0);
  const [taInput, setTaInput] = useState("");
  const [taFeedback, setTaFeedback] = useState<'correct' | 'wrong' | null>(null);
  const taInputRef = useRef<HTMLInputElement>(null);

  // ⏳ 타이머 로직 (안으로 이동 완료)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeView === 'timeattack' && isTaPlaying && taTimeLeft > 0) {
      timer = setInterval(() => {
        setTaTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (taTimeLeft <= 0 && isTaPlaying) {
      setIsTaPlaying(false);
      setIsFinished(true);
    }
    return () => clearInterval(timer);
  }, [isTaPlaying, taTimeLeft, activeView]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setChatInput(transcript);
        };

        recognition.onerror = () => setIsChatRecording(false);
        recognition.onend = () => setIsChatRecording(false);

        chatRecognitionRef.current = recognition;
      }
    }
  }, []);

  const handleToggleChatRecord = () => {
    if (!chatRecognitionRef.current) {
      toast.error("현재 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 권장합니다.");
      return;
    }
    if (isChatRecording) {
      chatRecognitionRef.current.stop();
      setIsChatRecording(false);
    } else {
      try {
        chatRecognitionRef.current.start();
        setIsChatRecording(true);
      } catch (err) {
        console.error("Recording start error:", err);
      }
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

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
      title: '나만의 맞춤 영작 퀴즈',
      description: '기록장에서 내가 썼던 문장을 AI가 빈칸 문제로 변형합니다.',
      icon: <Brain className="w-8 h-8 text-rose-500" />,
      isPro: false,
      color: 'bg-rose-50 border-rose-200 hover:border-rose-400',
    },
    {
      id: 'speaking',
      title: 'AI 뉘앙스 스피킹',
      description: '제시된 상황에 맞는 문장을 마이크로 말하고, AI에게 뉘앙스를 교정받으세요.',
      icon: <Mic className="w-8 h-8 text-emerald-500" />,
      isPro: true,
      color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    },
    {
      id: 'timeattack',
      title: '서바이벌 타임어택',
      description: '제한 시간 60초! 빠르고 정확하게 영작하여 시간을 늘려가는 생존 게임입니다.',
      icon: <Timer className="w-8 h-8 text-amber-500" />,
      isPro: true,
      color: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    },
  ];

  const handleCardClick = (mode: typeof quizModes[0]) => {
    if (!user) {
      toast.error("학습 퀴즈는 로그인 후 이용할 수 있습니다.\n3초 만에 가입하고 내 실력을 테스트해보세요!", { duration: 4000 });
      return;
    }

    if (mode.isPro && !isProUser) {
      setShowProModal(true);
    } else if (mode.id === 'word-quiz') {
      setActiveView('word-quiz');
      startQuiz();
    } else if (mode.id === 'weakness') {
      setActiveView('weakness-quiz');
      startWeaknessQuiz();
    } else if (mode.id === 'speaking') {
      setActiveView('speaking-quiz');
      setSelectedEpisode(null);
      setChatMessages([]);
    } else if (mode.id === 'timeattack') { // 👇 타임어택 진입 로직 추가
      setActiveView('timeattack');
      setIsFinished(false);
      setIsTaPlaying(false);
    }
  };

  const playAudio = (text: string) => {
    if (window.speechSynthesis.speaking) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      // DB에서 내 단어장 가져오기
      const { data: userVocab } = await supabase.from('vocab').select('word, meaning, pos');
      let myWords = userVocab || [];

      // 1. 내 단어장에서 최대 10개를 무작위로 뽑기
      myWords = shuffleArray(myWords).slice(0, 10);

      // 2. 무조건 20문제를 만들기 위해 필요한 나머지 개수 계산 (예: 내 단어가 6개면 14개 필요)
      const neededCount = 20 - myWords.length;

      // 3. 중복 출제 방지: 내 단어장에 이미 뽑힌 단어는 기본 단어풀에서 아예 삭제
      const myWordTextList = myWords.map(w => w.word.toLowerCase());
      const filteredDefaultWords = DEFAULT_WORDS.filter(w => !myWordTextList.includes(w.word.toLowerCase()));

      // 4. 필터링된 기본 단어에서 부족한 개수만큼 무작위로 뽑기
      const extraWords = shuffleArray(filteredDefaultWords).slice(0, neededCount);

      // 5. 내 단어 + 기본 단어를 합쳐서 최종 20문제 완성 후 한번 더 섞기
      const combinedWords = shuffleArray([...myWords, ...extraWords]);

      // 오답 보기 생성을 위한 뜻 모음집 (중복 방지)
      const allUniqueMeanings = Array.from(new Set([...myWords, ...filteredDefaultWords].map(item => item.meaning)));

      // 4지 선다형 보기 생성
      const generatedQuestions = combinedWords.map((correctItem) => {
        const wrongMeanings = shuffleArray(allUniqueMeanings)
          .filter(meaning => meaning !== correctItem.meaning)
          .slice(0, 3);
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
          const wordMeaning = item.meaning || "";
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
          meaning: item.meaning,
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

  // 💡 단어장 중복 체크 후 안전하게 저장하는 함수 (date 누락 에러 해결)
  const handleSaveVocab = async (q: any) => {
    if (!user) return;
    try {
      // 1. 내 단어장에 이미 존재하는 단어인지 확인
      const { data: existingWord, error: fetchError } = await supabase
        .from('vocab')
        .select('id')
        .eq('user_id', user.id)
        .eq('word', q.word)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // 2. 이미 존재하는 단어라면 안내 띄우고 즉시 종료
      if (existingWord) {
        toast.error(`'${q.word}'은(는) 이미 단어장에 존재합니다! 📚`);
        return;
      }

      // 👇 오늘 날짜 구하기 (예: '2026-09-18')
      const today = new Date().toISOString().split('T')[0];

      // 3. 존재하지 않는다면 안전하게 새로 추가 (date 값 포함)
      const { error: insertError } = await supabase.from('vocab').insert([
        {
          user_id: user.id,
          word: q.word,
          meaning: q.answer,
          pos: q.pos || '단어',
          date: today // 👈 에러의 원인이었던 date 칸을 채워줍니다!
        }
      ]);

      if (insertError) throw insertError;

      toast.success(`'${q.word}' 단어장에 저장 완료! 📚`);
    } catch (err) {
      console.error("단어장 저장 에러:", err);
      toast.error("저장에 실패했습니다.");
    }
  };

  // 💡 오늘 날짜로 학습 완료(출석) 기록을 남기는 함수
  const recordDailyStudy = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. 오늘 이미 출석 기록이 있는지 DB에 먼저 물어봅니다.
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', user.id)
        .eq('study_date', today)
        .single();

      // 2. 이미 기록이 있다면? 알림을 띄우지 않고 조용히 함수를 끝냅니다.
      if (existingRecord) {
        return;
      }

      // 3. 오늘 기록이 없다면? 새로 데이터를 넣고 축하 알림을 딱 한 번 띄웁니다!
      const { error } = await supabase
        .from('attendance')
        .insert([{ user_id: user.id, study_date: today }]);

      if (error) {
        console.error("학습 기록 실패:", error);
      } else {
        toast.success("오늘의 학습이 기록되었습니다! 잔디가 심어졌어요 🌱", { icon: '🔥' });
      }
    } catch (err) {
      console.error("학습 기록 에러:", err);
    }
  };

  const resetQuiz = async () => { // 👈 async 추가
    // 👇 퀴즈나 에피소드를 끝까지 완료한 상태에서 나가는 거라면 학습 기록 저장!
    if (isFinished || isEpisodeCleared) {
      await recordDailyStudy();
    }

    setIsPlaying(false);
    setIsFinished(false);
    setActiveView('dashboard');
    setSelectedEpisode(null);
    setChatMessages([]);
    setChatInput("");
    setIsEpisodeCleared(false);
    setIsTaPlaying(false);
  };

  const handleStartEpisode = (episode: typeof SPEAKING_EPISODES[0]) => {
    setSelectedEpisode(episode);
    setChatMessages([
      { role: 'ai', text: episode.firstLine, translation: episode.firstLineKo }
    ]);
    playAudio(episode.firstLine);
    setIsEpisodeCleared(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    const newUserMsg = { role: 'user' as const, text: userText };

    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatHints(null);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          episodeId: selectedEpisode?.id
        }),
      });

      if (!res.ok) throw new Error("서버 통신 실패");

      const data = await res.json();

      const newAiMsg = { role: 'ai' as const, text: data.text, translation: data.translation };
      setChatMessages(prev => [...prev, newAiMsg]);

      playAudio(data.text);

      if (data.isCompleted === true || data.isCompleted === "true") {
        setIsEpisodeCleared(true);
      }

    } catch (error) {
      toast.error("AI 답변을 받아오는 데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGetChatHint = async () => {
    if (chatMessages.length === 0 || isHintLoading) return;
    setIsHintLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages, episodeId: selectedEpisode?.id }),
      });
      if (!res.ok) throw new Error("힌트 요청 실패");

      const data = await res.json();
      setChatHints(data.hints);
    } catch (error) {
      toast.error("힌트를 불러오지 못했습니다.");
    } finally {
      setIsHintLoading(false);
    }
  };

  // 👇 🎮 타임어택 시작 함수
  const startTimeAttack = () => {
    setTaQuestions(shuffleArray([...TIME_ATTACK_QUESTIONS]));
    setTaCurrentIdx(0);
    setTaScore(0);
    setTaTimeLeft(60);
    setTaInput("");
    setIsFinished(false);
    setIsTaPlaying(true);
    setTimeout(() => taInputRef.current?.focus(), 100);
  };

  // 🚀 타임어택 정답 제출
  const handleTaSubmit = () => {
    // 👇 taFeedback이 있는 상태(피드백 진행 중)면 제출 무시!
    if (!taInput.trim() || !isTaPlaying || taFeedback) return;

    const currentQ = taQuestions[taCurrentIdx];

    const isCorrect = currentQ.answers.some(
      (ans: string) => normalizeString(taInput) === normalizeString(ans)
    );

    if (isCorrect) {
      setTaTimeLeft((prev) => Math.min(prev + 3, 60));
      setTaScore((prev) => prev + 1);
      setTaFeedback('correct');

      setTimeout(() => {
        setTaFeedback(null);
        setTaCurrentIdx((prev) => (prev + 1) % taQuestions.length);
        setTaInput("");
        taInputRef.current?.focus();
      }, 300);
    } else {
      setTaTimeLeft((prev) => prev - 5);
      setTaFeedback('wrong');
      setTimeout(() => setTaFeedback(null), 500);
      setTaInput("");
      taInputRef.current?.focus();
    }
  };

  // 🏃‍♂️ 타임어택 스킵 (모를 때)
  const handleTaSkip = () => {
    // 👇 taFeedback이 있는 상태(피드백 진행 중)면 스킵 무시!
    if (!isTaPlaying || taFeedback) return;

    setTaTimeLeft((prev) => prev - 5);
    setTaFeedback('wrong');

    // 스킵 시 배열의 첫 번째 값(대표 정답)을 보여줌
    setTaInput(taQuestions[taCurrentIdx].answers[0]);

    setTimeout(() => {
      setTaFeedback(null);
      setTaCurrentIdx((prev) => (prev + 1) % taQuestions.length);
      setTaInput("");
      taInputRef.current?.focus();
    }, 1200);
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
            {quizModes.map((mode) => {
              const isLocked = (!user) || (mode.isPro && !isProUser);

              return (
                <div
                  key={mode.id}
                  onClick={() => handleCardClick(mode)}
                  className={`relative p-6 md:p-8 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm group overflow-hidden bg-white
                    ${isLocked
                      ? 'border-slate-200 opacity-80 grayscale-[30%] hover:grayscale-0 hover:shadow-md'
                      : `border-transparent hover:shadow-lg ${mode.color}`
                    }`}
                >
                  {isLocked && (
                    <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-md z-10">
                      <Lock className="w-3 h-3 text-amber-300" />
                      <span>{!user ? '회원 전용' : 'PRO 전용'}</span>
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    {mode.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">{mode.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed min-h-[40px]">{mode.description}</p>
                  <div className="mt-6 flex justify-end">
                    <div className={`p-2 rounded-full transition-colors ${isLocked ? 'bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600' : 'bg-white text-slate-400 group-hover:bg-violet-600 group-hover:text-white shadow-sm'}`}>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 단어 퀴즈 화면 (객관식) */}
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
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                      {questions[currentIdx].word}
                    </span>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => playAudio(questions[currentIdx].word)}
                        className="p-2 bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-600 rounded-full transition-colors cursor-pointer shadow-sm"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSaveVocab(questions[currentIdx])}
                        className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors cursor-pointer shadow-sm"
                        title="단어장에 저장"
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>
                    </div>
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
              <div className="text-center w-full max-w-md">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">퀴즈 완료!</h2>
                <button onClick={resetQuiz} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold w-full cursor-pointer">대시보드로 돌아가기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. 심화 빈칸 타이핑 퀴즈 화면 */}
      {activeView === 'weakness-quiz' && (
        <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
          <div className="w-full mb-6 flex items-center gap-4">
            <button onClick={resetQuiz} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-rose-600 mb-1 flex items-center gap-2">
                <Brain className="w-6 h-6" /> 나만의 맞춤 영작 퀴즈
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

      {/* 4. AI 뉘앙스 스피킹 (멀티턴 롤플레잉 채팅 UI) */}
      {activeView === 'speaking-quiz' && (
        <div className="w-full max-w-4xl mx-auto py-8 md:py-10 px-4 flex flex-col h-[calc(100vh-80px)] animate-in slide-in-from-right-8 duration-300">

          <div className="w-full mb-6 flex items-center gap-4 shrink-0">
            <button onClick={resetQuiz} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-emerald-600 mb-1 flex items-center gap-2">
                <Mic className="w-6 h-6" /> AI 뉘앙스 스피킹
              </h1>
              <p className="text-slate-500 text-sm">
                {selectedEpisode ? selectedEpisode.title : "원하는 에피소드를 선택하고 대화를 시작해보세요."}
              </p>
            </div>
          </div>

          {!selectedEpisode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPEAKING_EPISODES.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleStartEpisode(episode)}
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between min-h-[200px]"
                >
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md mb-3">
                      {episode.level}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{episode.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{episode.description}</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
                <div className="text-center text-xs text-slate-400 font-medium mb-6">
                  {selectedEpisode.title} 에피소드가 시작되었습니다.
                </div>

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-1">
                          <BotIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <div className={`p-3.5 rounded-2xl text-sm md:text-base leading-relaxed ${msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                          }`}>
                          {msg.text}
                        </div>

                        {msg.translation && (
                          <div className={`text-xs font-medium px-1 ${msg.role === 'user' ? 'text-right text-slate-400' : 'text-slate-500'}`}>
                            {msg.translation}
                          </div>
                        )}

                        {msg.role === 'ai' && (
                          <button
                            onClick={() => playAudio(msg.text)}
                            className="mt-1 text-slate-400 hover:text-emerald-500 w-fit p-1 rounded-md transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
                {chatHints && (
                  <div className="mb-2 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-600">💡 이렇게 대답해보면 어떨까요?</span>
                      <button onClick={() => setChatHints(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {chatHints.map((hint, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setChatInput(hint.text);
                            setChatHints(null);
                            setTimeout(() => inputRef.current?.focus(), 10);
                          }}
                          className="text-left p-3 bg-white border border-emerald-100 hover:border-emerald-400 rounded-xl transition-all group cursor-pointer shadow-sm hover:shadow-md"
                        >
                          <div className="text-[10px] font-bold text-emerald-500 mb-1">{hint.type}</div>
                          <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">{hint.text}</div>
                          <div className="text-xs text-slate-500 mt-1 font-medium">{hint.translation}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isEpisodeCleared ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200 animate-in zoom-in duration-300">
                    <div className="text-3xl mb-2">🎉</div>
                    <h3 className="text-lg font-bold text-emerald-700 mb-1">에피소드 클리어!</h3>
                    <p className="text-sm text-emerald-600 mb-4 text-center">모든 상황극 목표를 훌륭하게 달성했습니다.</p>
                    <button
                      onClick={async () => {
                        await recordDailyStudy(); // 👈 다른 에피소드 넘어가기 전에 기록 쾅!
                        setSelectedEpisode(null);
                        setChatMessages([]);
                        setIsEpisodeCleared(false);
                      }}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      다른 에피소드 도전하기
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full gap-2">
                    <button
                      onClick={handleGetChatHint}
                      disabled={isHintLoading || isChatLoading}
                      className="text-xs flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isHintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                      힌트 보기
                    </button>

                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        disabled={isChatLoading}
                        placeholder={isChatLoading ? "AI가 답변을 고민 중입니다..." : "영어로 직접 답변을 입력하거나 마이크로 말하세요"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 pr-12 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={isChatLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>

                    <button
                      onClick={handleToggleChatRecord}
                      disabled={isChatLoading}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50 ${isChatRecording
                        ? "bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-100"
                        : "bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white"
                        }`}
                    >
                      {isChatRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 👇 5. 서바이벌 타임어택 UI 추가 완료 */}
      {activeView === 'timeattack' && (
        <div className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 flex flex-col items-center animate-in slide-in-from-right-8 duration-300">

          <div className="w-full mb-6 flex items-center gap-4">
            <button onClick={resetQuiz} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-amber-600 mb-1 flex items-center gap-2">
                <Timer className="w-6 h-6" /> 서바이벌 타임어택
              </h1>
              <p className="text-slate-500 text-sm">60초 안에 최대한 많은 문장을 번역하세요! (정답 +3초 / 오답 -5초)</p>
            </div>
          </div>

          <div className={`bg-white p-6 md:p-12 rounded-3xl shadow-sm border border-slate-200 w-full min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${taFeedback === 'wrong' ? 'ring-4 ring-red-500/50 bg-red-50 translate-x-1 -translate-x-1' : ''
            } ${taFeedback === 'correct' ? 'ring-4 ring-green-500/50 bg-green-50 scale-[1.02]' : ''}`}>

            {!isTaPlaying && !isFinished && (
              <div className="text-center w-full max-w-sm flex flex-col items-center animate-in zoom-in-95">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                  <Timer className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">도전할 준비 되셨나요?</h2>
                <p className="text-slate-500 mb-2">빠른 타이핑 속도와 순발력이 생명입니다.</p>
                <div className="bg-amber-50 text-amber-700 text-sm font-bold px-4 py-3 rounded-xl mb-8 leading-relaxed">
                  💡 대소문자는 구분하지 않으며,<br />
                  특수문자(?, !)는 생략해도 정답 처리됩니다.
                </div>
                <button
                  onClick={startTimeAttack}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xl rounded-2xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  게임 시작
                </button>
              </div>
            )}

            {isTaPlaying && !isFinished && taQuestions.length > 0 && (
              <div className="w-full max-w-lg flex flex-col items-center animate-in fade-in">
                {/* 상단 타이머 게이지바 */}
                <div className="w-full flex items-center gap-4 mb-10">
                  <div className="w-12 text-2xl font-black text-amber-600">{taTimeLeft}s</div>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${taTimeLeft > 20 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}
                      style={{ width: `${Math.min((taTimeLeft / 60) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-lg font-bold text-slate-500">🏆 {taScore}</div>
                </div>

                {/* 문제 영역 */}
                <div className="text-center mb-10">
                  <div className="text-sm font-bold text-amber-500 mb-3">빠르게 영작하세요!</div>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-900 break-keep">
                    "{taQuestions[taCurrentIdx].ko}"
                  </h3>
                </div>

                {/* 입력 컨트롤러 */}
                <div className="w-full relative">
                  <input
                    ref={taInputRef}
                    type="text"
                    value={taInput}
                    onChange={(e) => setTaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTaSubmit()}
                    placeholder="Enter 영어 문장..."
                    className="w-full p-4 md:p-5 pl-6 pr-16 text-center text-xl md:text-2xl font-bold rounded-2xl border-2 border-slate-200 bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 text-slate-900 outline-none transition-all shadow-sm"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <button
                    onClick={handleTaSubmit}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleTaSkip}
                  disabled={!!taFeedback}
                  className={`mt-6 text-sm font-bold transition-all duration-300 ${taFeedback
                      ? "opacity-30 text-slate-300 cursor-not-allowed pointer-events-none"
                      : "text-slate-400 hover:text-red-500 underline underline-offset-4 cursor-pointer"
                    }`}
                >
                  모르겠어요 (시간 -5초 패스)
                </button>
              </div>
            )}

            {isFinished && (
              <div className="text-center w-full max-w-sm flex flex-col items-center animate-in zoom-in-95">
                <div className="text-6xl mb-4">🔥</div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">TIME OVER</h2>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 w-full mb-8 shadow-sm">
                  <div className="text-slate-500 font-medium mb-1">나의 최종 기록</div>
                  <div className="text-5xl font-black text-amber-600">{taScore}<span className="text-2xl text-slate-400 ml-1">문장</span></div>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={async () => {
                      await recordDailyStudy(); // 👈 다시 도전하기 전에 기록 쾅!
                      startTimeAttack();
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    다시 도전
                  </button>
                  <button onClick={resetQuiz} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer">
                    나가기
                  </button>
                </div>
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

// 간단한 AI 아이콘 컴포넌트
function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}