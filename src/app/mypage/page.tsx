"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, LogOut, Trash2, Edit2, ChevronLeft, Check, X, Loader2, Camera, RotateCcw, AlertTriangle, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage'; 
import toast from 'react-hot-toast';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [subscription, setSubscription] = useState<any>(null);
  const [isProUser, setIsProUser] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        const ADMIN_EMAILS = ['plimieom0@gmail.com', 'admin@zipil.com'];
        let hasProAccess = ADMIN_EMAILS.includes(session.user.email || '');

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (subData) {
          setSubscription(subData);
          if (subData.status === 'ACTIVE') {
            hasProAccess = true;
          }
        }
        
        setIsProUser(hasProAccess);
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    };
    getUserProfile();
  }, [router]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdatingName(true);

    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName.trim() }
    });

    if (error) {
      toast.error("닉네임 변경 중 오류가 발생했습니다.");
    } else if (data.user) {
      setUser(data.user);
      setIsEditingName(false);
      toast.success("닉네임이 성공적으로 변경되었습니다! 🎉");
    }
    setIsUpdatingName(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploadingImage(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error("이미지 크롭 실패");

      const filePath = `${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { custom_avatar: publicUrl }
      });

      if (updateError) throw updateError;
      if (data.user) {
        setUser(data.user);
        toast.success("프로필 이미지가 예쁘게 적용되었습니다! 📸");
      }
    } catch (error) {
      console.error(error);
      toast.error("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
      setImageToCrop(null);
    }
  };

  const handleResetImage = async () => {
    if (!confirm("기본 프로필 이미지로 돌아가시겠습니까?")) return;
    setIsUploadingImage(true);

    const { data, error } = await supabase.auth.updateUser({
      data: { custom_avatar: null }
    });

    if (error) {
      toast.error("오류가 발생했습니다.");
    } else if (data.user) {
      setUser(data.user);
    }
    setIsUploadingImage(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const executeDeleteAccount = async () => {
    setIsLoading(true); 
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      toast.success("탈퇴 처리가 완료되었습니다. 30일 이내 로그인 시 복구 가능합니다.", { duration: 4000 });
      await supabase.auth.signOut();
      
      setShowDeleteModal(false);
      router.push('/');
    } catch (error) {
      console.error(error);
      toast.error("탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'CANCELED', 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("구독이 해지되었습니다. 자동 결제가 차단됩니다.");
      setSubscription({ ...subscription, status: 'CANCELED' }); 
      setShowCancelModal(false);
    } catch (error) {
      console.error(error);
      toast.error("구독 해지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-slate-500">
        프로필을 불러오는 중입니다...
      </div>
    );
  }

  if (!user) return null;

  const getProfileImage = () => {
    const meta = user?.user_metadata;
    const fallbackName = encodeURIComponent(meta?.display_name || meta?.full_name || 'U');
    const uiAvatarUrl = `https://ui-avatars.com/api/?name=${fallbackName}&background=random`;

    if (meta?.custom_avatar) return meta.custom_avatar;
    if (meta?.avatar_url && meta.avatar_url.includes('pixabay')) return uiAvatarUrl;
    if (meta?.avatar_url) return meta.avatar_url;
    
    return uiAvatarUrl;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center px-4 py-8 md:p-12">
      <div className="w-full max-w-2xl">

        {/* 💡 헤더 전체를 flex-between으로 변경하여 양끝 배치 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">내 프로필 설정</h1>
              <p className="text-sm text-slate-500 hidden sm:block">계정 정보 확인 및 설정을 관리하세요.</p>
            </div>
          </div>

          {/* 💡 뱃지를 헤더 우측으로 이동 */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isProUser ? (
              <span className="bg-indigo-500 text-white text-xs font-black px-3 py-1.5 rounded-lg tracking-wider shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> PRO
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-xs font-black px-3 py-1.5 rounded-lg tracking-wider border border-slate-200">
                Free
              </span>
            )}
            
            {subscription && subscription.status === 'ACTIVE' && (
              <button 
                onClick={() => setShowCancelModal(true)}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors underline underline-offset-2"
              >
                구독 해지하기
              </button>
            )}
          </div>
        </div>

        {/* 프로필 정보 카드 (내부 뱃지 로직 제거) */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative shrink-0 group">
              <img
                src={getProfileImage()}
                alt="프로필 이미지"
                className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-slate-50 shadow-md object-cover transition-opacity ${isUploadingImage ? 'opacity-50' : ''}`}
                referrerPolicy="no-referrer"
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                title="이미지 변경"
              >
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              {user.user_metadata.custom_avatar && (
                <button
                  onClick={handleResetImage}
                  disabled={isUploadingImage}
                  className="absolute top-0 right-0 p-1.5 bg-rose-100 text-rose-500 rounded-full shadow-sm hover:bg-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                  title="기본 이미지로 복구"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">닉네임</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 h-[52px]">
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={isUpdatingName}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="새 닉네임 입력"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handleUpdateName}
                          disabled={isUpdatingName || !newName.trim()}
                          className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                          title="저장"
                        >
                          {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          disabled={isUpdatingName}
                          className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-800 flex-1 pl-1">
                        {user.user_metadata.display_name || user.user_metadata.full_name}
                      </span>
                      <button
                        onClick={() => {
                          setNewName(user.user_metadata.display_name || user.user_metadata.full_name);
                          setIsEditingName(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer shrink-0"
                        title="닉네임 변경"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">연동된 이메일</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 opacity-70">
                  <span className="font-medium text-slate-600 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.email}
                  </span>
                  {user?.app_metadata?.provider === 'google' && (
                    <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold shrink-0">
                      Google
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 shadow-sm group cursor-pointer"
          >
            <div className="flex items-center gap-3 font-semibold">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                <LogOut className="w-5 h-5 text-slate-600" />
              </div>
              로그아웃
            </div>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between bg-white border border-rose-100 p-4 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-600 shadow-sm group cursor-pointer"
          >
            <div className="flex items-center gap-3 font-semibold">
              <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              계정 탈퇴 및 데이터 삭제
            </div>
          </button>
        </div>
      </div>

      {imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">프로필 이미지 조정</h3>
              <button onClick={() => setImageToCrop(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[300px] md:h-[400px] bg-slate-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1} 
                cropShape="round" 
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-5 space-y-4 bg-white">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">축소</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-xs font-bold text-slate-400">확대</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setImageToCrop(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  취소
                </button>
                <button onClick={handleCropConfirm} disabled={isUploadingImage} className="flex-1 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors flex justify-center items-center gap-2 cursor-pointer">
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : "이대로 적용하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">정말 구독을 해지하시겠습니까?</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              해지하더라도 이번 결제 주기인 <span className="font-bold text-slate-800">{formatDate(subscription?.next_billing_date)}</span>까지는 PRO 혜택을 계속 누리실 수 있으며, 이후 자동 결제가 차단됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCanceling}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                유지하기
              </button>
              <button
                onClick={executeCancelSubscription}
                disabled={isCanceling}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : '해지하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">정말 탈퇴하시겠습니까?</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              탈퇴 시 작성하신 데이터는 부정이용 방지 및 복구 지원을 위해 <span className="font-bold text-rose-600">30일간 보관된 후 영구 파기</span>되며, 이 기간 동안 동일한 이메일로 재가입할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={executeDeleteAccount}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}