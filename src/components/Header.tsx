"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { PawPrint } from "lucide-react";

import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";

const navLinkClass =
  "text-sm font-medium text-content-secondary hover:text-content transition-colors";

export default function Header() {
  const t = useTranslations("header");
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated" && !!session?.user;

  return (
    <header className="sticky top-0 z-header bg-surface border-b border-border">
      {/* 페이지의 첫 초점. 평소에는 숨어 있다가 Tab 한 번에 드러나고,
          누르면 헤더 링크 전부를 건너뛰어 본문으로 간다. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2.5 focus:z-header focus:inline-flex focus:h-11 focus:items-center focus:rounded-full focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <PawPrint className="w-6 h-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-bold text-content text-base">Paw Spot Global</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/places" className={navLinkClass}>
              {t("places")}
            </Link>

            <Link href="/#categories" className={navLinkClass}>
              {t("category")}
            </Link>

            <Link href="/profile/dogs" className={navLinkClass}>
              {t("myDog")}
            </Link>

            <Link href="/favorites" className={navLinkClass}>
              {t("favorites")}
            </Link>

            <span
              className="flex items-center gap-1.5 text-sm font-medium text-content-muted cursor-not-allowed select-none"
              aria-disabled="true"
            >
              {t("vets")}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-surface-subtle text-content-secondary">
                {t("comingSoon")}
              </span>
            </span>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm font-medium text-content max-w-[10rem] truncate">
                  {session.user?.name ?? session.user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className={navLinkClass}
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <Link href="/login" className={navLinkClass}>
                {t("login")}
              </Link>
            )}
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
