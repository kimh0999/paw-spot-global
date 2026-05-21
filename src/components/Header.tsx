"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "홈", href: "/" },
  { label: "플레이스", href: "/places" },
  { label: "동물병원", href: "/vets" },
  { label: "이용 방법", href: "/guide" },
  { label: "검증 기준", href: "/verify-standards" },
];

export default function Header() {
  const [lang, setLang] = useState<"ko" | "en">("ko");

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-gray-900 text-base">
              Paw Spot Global
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors first:text-orange-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 shrink-0">
            {(["ko", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  lang === l
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
