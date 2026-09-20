import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteOrigin } from "@/lib/seo/site";
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

/**
 * 루트는 **locale 중립인 것만** 둔다.
 *
 * 이전에는 여기에 한국어 제목·설명이 박혀 있어 `/en` 페이지까지 그대로 물려받았다.
 * locale별 문구는 `[locale]/layout.tsx`가 `generateMetadata`로 만든다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Paw Spot Global",
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
