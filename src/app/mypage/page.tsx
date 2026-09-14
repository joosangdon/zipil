"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, LogOut, Trash2, Edit2, ChevronLeft, Check, X, Loader2, Camera, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage'; // 경로가 다르면 맞게 수정해주세요

// 1. 파일 맨 위 아이콘 모음에 AlertTriangle 추가, toast 불러오기
import toast from 'react-hot-toast';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 모달창 띄우기 상태 추가
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false); // 수정 모드인지 확인
  const [newName, setNewName] = useState(""); // 입력한 새 닉네임 저장
  const [isUpdatingName, setIsUpdatingName] = useState(false); // DB 저장 중 로딩 상태

  // 이미지 업로드를 위한 상태와 참조(Ref) 추가
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // (이미지가 깨졌는지 여부를 기억하는 스위치)
  const [avatarError, setAvatarError] = useState(false);

  // 👇 크롭 기능을 위한 상태들
  const [imageToCrop, setImageToCrop] = useState<string | null>(null); // 사용자가 선택한 원본 이미지
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // 크롭 위치
  const [zoom, setZoom] = useState(1); // 확대/축소
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null); // 잘라낼 픽셀 영역

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        router.push('/login'); // 비로그인 유저 튕겨내기
      }
      setIsLoading(false);
    };
    getUserProfile();
  }, [router]);

  // 👇 닉네임 변경 저장 함수
  const handleUpdateName = async () => {
    if (!newName.trim()) return; // 빈칸이면 무시

    setIsUpdatingName(true);

    // Supabase에 유저 정보(user_metadata) 업데이트 요청
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName.trim() }
    });

    if (error) {
      alert("닉네임 변경 중 오류가 발생했습니다.");
    } else if (data.user) {
      setUser(data.user); // 성공 시 화면의 유저 정보도 즉시 새 닉네임으로 교체
      setIsEditingName(false); // 수정 모드 종료
      alert("닉네임이 성공적으로 변경되었습니다! 🎉");
    }

    setIsUpdatingName(false);
  };

  // 👇 1. 새 프로필 이미지 업로드 함수
  // ① 파일 선택 시 크롭 모달을 띄우기 위해 이미지를 읽어오는 함수
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

  // ② 모달에서 '적용하기'를 눌렀을 때 이미지를 자르고 Supabase에 올리는 함수
  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploadingImage(true);
    try {
      // util 함수를 사용해 잘라낸 이미지 Blob(파일 형태) 얻기
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error("이미지 크롭 실패");

      // 파일명 생성 및 Supabase 업로드
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
        alert("프로필 이미지가 예쁘게 적용되었습니다! 📸");
      }
    } catch (error) {
      console.error(error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
      setImageToCrop(null); // 모달 닫기
    }
  };



  // 👇 2. 기본 이미지(구글)로 복구하는 함수
  const handleResetImage = async () => {
    if (!confirm("기본 프로필 이미지로 돌아가시겠습니까?")) return;

    setIsUploadingImage(true);

    // 유저 메타데이터에서 custom_avatar 값을 빈 값(null)으로 덮어씀
    const { data, error } = await supabase.auth.updateUser({
      data: { custom_avatar: null }
    });

    if (error) {
      alert("오류가 발생했습니다.");
    } else if (data.user) {
      setUser(data.user);
    }

    setIsUploadingImage(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 👇 회원 탈퇴 처리 함수 (Soft Delete 방식 - 30일 유예)
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

      // ❌ alert 대신 토스트 사용
      toast.success("탈퇴 처리가 완료되었습니다. 30일 이내 로그인 시 복구 가능합니다.", { duration: 4000 });
      await supabase.auth.signOut();
      
      // 모달 닫기 및 홈 이동
      setShowDeleteModal(false);
      router.push('/');
    } catch (error) {
      console.error(error);
      toast.error("탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
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

  // 💡 데이터베이스에서 직접 읽어서 '안전한' 이미지 주소만 골라내는 함수
  const getProfileImage = () => {
    const meta = user?.user_metadata;
    const fallbackName = encodeURIComponent(meta?.display_name || meta?.full_name || 'U');
    const uiAvatarUrl = `https://ui-avatars.com/api/?name=${fallbackName}&background=random`;

    if (meta?.custom_avatar) return meta.custom_avatar;
    if (meta?.avatar_url && meta.avatar_url.includes('pixabay')) return uiAvatarUrl;
    if (meta?.avatar_url) return meta.avatar_url;
    
    return uiAvatarUrl;
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col items-center px-4 py-8 md:p-12">
      <div className="w-full max-w-2xl">

        {/* 상단 헤더 및 뒤로가기 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">내 프로필 설정</h1>
            <p className="text-sm text-slate-500">계정 정보 확인 및 설정을 관리하세요.</p>
          </div>
        </div>

        {/* 프로필 정보 카드 */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative shrink-0 group">
              {/* 이미지는 custom_avatar가 있으면 그걸 쓰고, 없으면 구글 기본(avatar_url)을 씀 */}
              <img
                src={getProfileImage()} // 함수 직접 호출 유지
                alt="프로필 이미지"
                // 👇 클래스명만 마이페이지 원래 사이즈로 복구!
                className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-slate-50 shadow-md object-cover transition-opacity ${isUploadingImage ? 'opacity-50' : ''}`}
                referrerPolicy="no-referrer"
              />

              {/* 파일 선택창 (화면에는 안 보임) */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
              />

              {/* 사진 변경 버튼 (마우스 올리면 보임) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                title="이미지 변경"
              >
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>

              {/* 기본 이미지 복구 버튼 (커스텀 이미지가 있을 때만 보임) */}
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
                    /* 수정 모드 켜졌을 때 (Input 창) */
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
                    /* 기본 모드 (텍스트 + 연필 아이콘) */
                    <>
                      <span className="font-semibold text-slate-800 flex-1 pl-1">
                        {user.user_metadata.display_name || user.user_metadata.full_name}
                      </span>
                      <button
                        onClick={() => {
                          setNewName(user.user_metadata.display_name || user.user_metadata.full_name);
                          setIsEditingName(true); // 수정 모드 켜기
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
                  <span className="font-medium text-slate-600 flex-1">
                    {user.email}
                  </span>
                  {user?.app_metadata?.provider === 'google' && (
                    <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">
                      Google
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 계정 관리 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 shadow-sm group"
          >
            <div className="flex items-center gap-3 font-semibold">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                <LogOut className="w-5 h-5 text-slate-600" />
              </div>
              로그아웃
            </div>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)} // 클릭 시 모달 열기!
            className="w-full flex items-center justify-between bg-white border border-rose-100 p-4 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-600 shadow-sm group"
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
      {/* 👇 이미지 크롭 모달창 (imageToCrop에 데이터가 들어오면 팝업됨) */}
      {imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">프로필 이미지 조정</h3>
              <button onClick={() => setImageToCrop(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 크롭 영역 (react-easy-crop 컴포넌트) */}
            <div className="relative w-full h-[300px] md:h-[400px] bg-slate-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1} // 1:1 비율 고정 (동그란 프로필용)
                cropShape="round" // 자르는 영역을 동그랗게 보여줌
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                onZoomChange={setZoom}
              />
            </div>

            {/* 하단 컨트롤 및 버튼 */}
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
                <button
                  onClick={() => setImageToCrop(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCropConfirm}
                  disabled={isUploadingImage}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors flex justify-center items-center gap-2"
                >
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : "이대로 적용하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 👇 2. 화면 맨 아래 (</main> 닫히기 직전)에 커스텀 모달 UI 추가 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              정말 탈퇴하시겠습니까?
            </h3>
            
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