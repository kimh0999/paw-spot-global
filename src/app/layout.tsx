import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paw Spot Global — 반려견 동반 장소 안내",
  description:
    "반려견과 갈 수 있는 장소를 지도에서 쉽게 확인하세요. 카페, 음식점, 여행지 정보를 방문 전에 확인합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
