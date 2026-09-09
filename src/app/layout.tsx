import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

// 라틴은 Inter, 한글은 Noto Sans KR이 맡는다. 한 벌만 쓰면 한쪽 언어가 시스템 기본
// 폰트로 떨어져 같은 화면에서 자간·굵기가 어긋난다 (DESIGN.md §4 Typography).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-korean",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paw Spot Global — 반려견 동반 장소 안내",
  description:
    "반려견과 갈 수 있는 장소를 지도에서 쉽게 확인하세요. 카페, 음식점, 여행지 정보를 방문 전에 확인합니다.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn("font-sans", inter.variable, notoSansKr.variable)}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
