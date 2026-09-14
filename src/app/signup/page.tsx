"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, KeyRound, User, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast'; // ✅ 토스트 알림 추가

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);

  // ✅ 1. 이메일 분리 상태 추가
  const [emailId, setEmailId] = useState("");
  const [emailDomain, setEmailDomain] = useState("naver.com");
  const [customDomain, setCustomDomain] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const [formData, setFormData] = useState({
    email: '', // 1단계 완료 시 조립된 이메일이 여기에 저장됩니다.
    otp: '',
    fullName: '',
    password: '',
    passwordConfirm: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 1 && step < 4) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  const handleGoBack = async () => {
    if (step > 1) {
      const confirmLeave = window.confirm("처음부터 다시 진행하시겠습니까? 진행 중인 정보는 모두 초기화됩니다.");
      if (!confirmLeave) return;

      setIsLoading(true);
      try {
        if (step >= 3) {
          await supabase.rpc('delete_ghost_user');
          await supabase.auth.signOut();
        }
        setFormData({ email: '', otp: '', fullName: '', password: '', passwordConfirm: '' });
        setEmailId(''); // 초기화
        setStep(1);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ✅ 2. 이메일 조립 및 정규식 검사 로직 적용
  const handleSendOtp = async () => {
    const domain = isCustom ? customDomain : emailDomain;
    const fullEmail = `${emailId}@${domain}`;

    // 이메일 아이디 유효성 검사 (영문, 숫자, _ . - 허용)
    const idRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!emailId || !idRegex.test(emailId)) {
      return toast.error("이메일 아이디는 영문, 숫자, 특수기호(_ . -)만 사용할 수 있습니다.");
    }

    // 도메인 유효성 검사 (@ 뒷부분 형식 검사)
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return toast.error("올바른 이메일 도메인 형식(예: naver.com)을 입력해 주세요.");
    }

    setIsLoading(true);

    try {
      const { data: existingUser } = await supabase.from('profiles').select('email').eq('email', fullEmail).maybeSingle();
      if (existingUser) {
        setIsLoading(false);
        return toast.error("이미 가입된 이메일입니다. 다른 이메일을 사용해주세요!");
      }

      const { data, error } = await supabase.auth.signUp({ email: fullEmail, password: 'TempPassword123!' });
      if (error) throw error;

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setIsLoading(false);
        return toast.error("이미 구글 로그인 등으로 가입된 이메일입니다. 다른 이메일을 사용해주세요!");
      }

      // 조립된 이메일을 formData에 저장 (다음 단계들에서 쓰기 위해)
      setFormData({ ...formData, email: fullEmail });

      toast.success("인증번호가 발송되었습니다! 메일함을 확인해주세요.");
      setTimeLeft(180);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 3. 모든 alert를 toast.error로 교체
  const handleVerifyOtp = async () => {
    if (timeLeft === 0) return toast.error("인증 시간이 만료되었습니다. 처음부터 다시 진행해주세요.");
    if (formData.otp.length !== 6) return toast.error("6자리 인증번호를 입력해주세요.");
    setIsLoading(true);

    const { error } = await supabase.auth.verifyOtp({ email: formData.email, token: formData.otp, type: 'signup' });
    setIsLoading(false);

    if (error) {
      return toast.error("인증번호가 틀렸습니다. 다시 확인해주세요.");
    }
    setStep(3);
  };

  const handleProfileSetup = () => {
    if (!formData.fullName) return toast.error("닉네임을 입력해주세요.");

    const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
    if (!nicknameRegex.test(formData.fullName)) {
      return toast.error("닉네임에 특수문자를 포함할 수 없습니다. (한글/영문/숫자만 가능)");
    }

    setStep(4);
  };

  const handleFinish = async () => {
    if (formData.password.length < 6) return toast.error("비밀번호는 6자 이상이어야 합니다.");
    if (formData.password !== formData.passwordConfirm) return toast.error("비밀번호가 서로 일치하지 않습니다.");

    setIsLoading(true);

    try {
      const defaultAvatar = `https://ui-avatars.com/api/?name=${formData.fullName}&background=random`;

      const { data: { user }, error: authError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          display_name: formData.fullName,
          avatar_url: defaultAvatar
        }
      });

      if (authError || !user) throw authError;

      const generatedUsername = `user_${Math.floor(100000 + Math.random() * 900000)}`;

      const { error: dbError } = await supabase.from('profiles').insert({
        id: user.id,
        email: formData.email,
        username: generatedUsername,
        full_name: formData.fullName,
        avatar_url: defaultAvatar
      });

      if (dbError) throw dbError;

      toast.success("회원가입이 완료되었습니다! 환영합니다.");
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error("최종 가입 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">

        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div className="h-full bg-violet-600 transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        <div className="flex items-center gap-4 mb-8 mt-2">
          {step === 1 ? (
            <Link href="/login" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <button onClick={handleGoBack} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-slate-900">
            {step === 1 && "이메일 입력"}
            {step === 2 && "인증번호 확인"}
            {step === 3 && "프로필 설정"}
            {step === 4 && "비밀번호 설정"}
          </h1>
        </div>

        {/* ✅ 4. 1단계: 이메일 입력창 분리 UI 적용 */}
        {/* ✅ 4. 1단계: 이메일 입력창 분리 UI (비율 고정 적용) */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-slate-500 text-sm">가입하실 이메일 주소를 입력해 주세요.<br />해당 이메일로 인증번호가 발송됩니다.</p>
            
            <div className="flex items-center gap-2 w-full">
              {/* 👇 왼쪽 칸: flex-1을 주어 공간을 정확히 고정 */}
              <input
                type="text"
                placeholder="이메일 아이디"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                className="flex-1 min-w-0 py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
              />
              
              <span className="text-slate-400 font-bold shrink-0">@</span>
              
              {/* 👇 오른쪽 칸: 마찬가지로 flex-1을 주어 왼쪽과 1:1 비율 고정 */}
              <div className="flex-1 min-w-0">
                {isCustom ? (
                  <div className="flex w-full gap-1 items-center">
                    <input
                      type="text"
                      placeholder="도메인 입력"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full min-w-0 py-3.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-sm"
                    />
                    <button 
                      onClick={() => setIsCustom(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 whitespace-nowrap px-1 cursor-pointer shrink-0"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <select
                    value={emailDomain}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustom(true);
                        setCustomDomain("");
                      } else {
                        setEmailDomain(e.target.value);
                      }
                    }}
                    className="w-full py-3.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-sm cursor-pointer"
                  >
                    <option value="naver.com">naver.com</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="hanmail.net">hanmail.net</option>
                    <option value="nate.com">nate.com</option>
                    <option value="custom">직접 입력...</option>
                  </select>
                )}
              </div>
            </div>

            <button onClick={handleSendOtp} disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>인증번호 받기 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* 2단계 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-slate-500 text-sm"><span className="font-bold text-violet-600">{formData.email}</span>(으)로<br />발송된 6자리 인증번호를 입력해 주세요.</p>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="text" name="otp" maxLength={6} value={formData.otp} onChange={handleChange} placeholder="123456" disabled={timeLeft === 0} className="w-full pl-11 pr-16 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-[0.5em] text-center text-lg font-bold disabled:opacity-50" />

              <div className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm ${timeLeft <= 30 ? 'text-red-500' : 'text-violet-600'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
            <button onClick={handleVerifyOtp} disabled={isLoading || timeLeft === 0} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 cursor-pointer">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>인증하기 <Check className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* 3단계 */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-slate-500 text-sm">집필중에서 사용할 <br />멋진 닉네임을 설정해 주세요.</p>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="닉네임 (한글/영문/숫자)" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium" />
              </div>
            </div>

            <button
              onClick={handleProfileSetup}
              disabled={!formData.fullName || isLoading}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>다음 단계로 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* 4단계 */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-slate-500 text-sm">마지막입니다!<br />로그인에 사용할 비밀번호를 설정해 주세요.</p>
            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="비밀번호 (6자 이상)" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} placeholder="비밀번호 확인" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium" />
              </div>
            </div>
            <button onClick={handleFinish} disabled={isLoading || !formData.password || !formData.passwordConfirm} className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "가입 완료하기 🎉"}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}