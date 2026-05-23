"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";

export default function Header() {
  const t = useTranslations("header");

  const navLinks = [
    { label: t("home"), href: "/" },
    { label: t("places"), href: "/places" },
    { label: t("vets"), href: "/vets" },
    { label: t("guide"), href: "/guide" },
    { label: t("verifyStandards"), href: "/verify-standards" },
  ];

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

          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
