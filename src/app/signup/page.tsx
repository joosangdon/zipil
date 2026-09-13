"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, KeyRound, User, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(180);

  // username 상태 제거 (서버 전송 시 자동 생성)
  const [formData, setFormData] = useState({
    email: '',
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
    // 1. 초기값을 지정해주고 (undefined 상태 허용)
    let timer: NodeJS.Timeout | undefined;

    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }

    return () => {
      // 2. timer에 값이 들어가 있을 때만 안전하게 클리어!
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
        setStep(1);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email) return alert("이메일을 입력해주세요.");
    setIsLoading(true);

    try {
      const { data: existingUser } = await supabase.from('profiles').select('email').eq('email', formData.email).maybeSingle();
      if (existingUser) {
        setIsLoading(false);
        return alert("이미 가입된 이메일입니다. 다른 이메일을 사용해주세요!");
      }

      const { data, error } = await supabase.auth.signUp({ email: formData.email, password: 'TempPassword123!' });
      if (error) throw error;

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setIsLoading(false);
        return alert("이미 구글 로그인 등으로 가입된 이메일입니다. 다른 이메일을 사용해주세요!");
      }

      alert("인증번호가 발송되었습니다! 메일함을 확인해주세요.");
      setTimeLeft(180);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (timeLeft === 0) return alert("인증 시간이 만료되었습니다. 처음부터 다시 진행해주세요.");
    if (formData.otp.length !== 6) return alert("6자리 인증번호를 입력해주세요.");
    setIsLoading(true);

    const { error } = await supabase.auth.verifyOtp({ email: formData.email, token: formData.otp, type: 'signup' });
    setIsLoading(false);

    if (error) {
      return alert("인증번호가 틀렸습니다. 다시 확인해주세요.");
    }
    setStep(3);
  };

  // 🚨 3단계: 닉네임만 빠르고 깔끔하게 체크
  const handleProfileSetup = () => {
    if (!formData.fullName) return alert("닉네임을 입력해주세요.");

    const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
    if (!nicknameRegex.test(formData.fullName)) {
      return alert("닉네임에 특수문자를 포함할 수 없습니다. (한글/영문/숫자만 가능)");
    }

    setStep(4);
  };

  const handleFinish = async () => {
    if (formData.password.length < 6) return alert("비밀번호는 6자 이상이어야 합니다.");
    if (formData.password !== formData.passwordConfirm) return alert("비밀번호가 서로 일치하지 않습니다.");

    setIsLoading(true);

    try {
      // 💡 1. 막히지 않는 예쁜 기본 이미지 생성 (유저 닉네임 활용)
      const defaultAvatar = `https://ui-avatars.com/api/?name=${formData.fullName}&background=random`;

      // 2. Auth 업데이트 (금고) - 🚨 여기에 avatar_url을 같이 넣어줘야 마이페이지에서 즉시 보입니다!
      const { data: { user }, error: authError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          display_name: formData.fullName,
          avatar_url: defaultAvatar // 👈 여기 추가됨!
        }
      });

      if (authError || !user) throw authError;

      const generatedUsername = `user_${Math.floor(100000 + Math.random() * 900000)}`;

      // 3. Profiles 테이블 업데이트 (DB)
      const { error: dbError } = await supabase.from('profiles').insert({
        id: user.id,
        email: formData.email,
        username: generatedUsername,
        full_name: formData.fullName,
        avatar_url: defaultAvatar // 👈 여기도 똑같이 넣어줌!
      });

      if (dbError) throw dbError;

      alert("🎉 회원가입이 완료되었습니다!");
      router.push('/');
    } catch (err) {
      console.error(err);
      alert("최종 가입 처리 중 오류가 발생했습니다.");
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

        {/* 1단계, 2단계는 동일 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-slate-500 text-sm">가입하실 이메일 주소를 입력해 주세요.<br />해당 이메일로 인증번호가 발송됩니다.</p>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="zipil@example.com" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium" />
            </div>
            <button onClick={handleSendOtp} disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>인증번호 받기 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

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
            <button onClick={handleVerifyOtp} disabled={isLoading || timeLeft === 0} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>인증하기 <Check className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* 🚨 3단계: 아이디 입력 삭제, 닉네임만 받음 */}
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
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>다음 단계로 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* 🚨 4단계: 비밀번호 특수문자 허용 */}
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
            <button onClick={handleFinish} disabled={isLoading || !formData.password || !formData.passwordConfirm} className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "가입 완료하기 🎉"}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}