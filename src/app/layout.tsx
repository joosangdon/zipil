import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // 👇 방금 만든 사이드바 불러오기

// 1. react-hot-toast에서 Toaster 불러오기
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "집필중 (Zipil)",
  description: "AI 영작 & 인터랙티브 발음 교정 워크스페이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 👇 전체 화면을 가득 채우고, 좌/우로 쪼개는 틀(Flexbox) */}
        <div className="flex h-screen overflow-hidden bg-[#FAF9F6]">
          
          {/* 좌측: 항상 고정되어 있는 사이드바 */}
          <Sidebar />

          {/* 우측: 메뉴를 누를 때마다 쇽쇽 바뀌는 메인 콘텐츠 (page.tsx 들이 들어옴) */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          
        </div>

        {/* 👇 2. 최상위 레이아웃에 Toaster 추가 (모든 페이지에서 알림이 뜨게 함) */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: '#334155',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '12px',
              // 👇 이 두 줄이 핵심입니다! 넓이를 늘려주고, 한국어 단어가 중간에 끊기지 않게 방어합니다.
              maxWidth: '500px', 
              wordBreak: 'keep-all',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}