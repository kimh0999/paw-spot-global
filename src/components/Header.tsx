"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Heart, MapPin, PawPrint } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: "places" | "myDog" | "favorites";
  /** 현재 위치 판정에 쓰는 경로 접두사. */
  match: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/places", labelKey: "places", match: "/places" },
  { href: "/profile/dogs", labelKey: "myDog", match: "/profile/dogs" },
  { href: "/favorites", labelKey: "favorites", match: "/favorites" },
];

export default function Header() {
  const t = useTranslations("header");
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated" && !!session?.user;

  function isCurrent(match: string) {
    return pathname === match || pathname.startsWith(`${match}/`);
  }

  return (
    <header className="sticky top-0 z-header border-b border-border bg-surface">
      {/* 페이지의 첫 초점. 평소에는 숨어 있다가 Tab 한 번에 드러나고,
          누르면 헤더 링크 전부를 건너뛰어 본문으로 간다. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2.5 focus:z-header focus:inline-flex focus:h-11 focus:items-center focus:rounded-full focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>

      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex h-11 shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-panel bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight text-content">
            Paw Spot
          </span>
        </Link>

        {/* 데스크톱 주 내비게이션. 현재 위치는 색과 밑줄 두 가지로 표시한다. */}
        <nav aria-label={t("primaryNav")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const current = isCurrent(item.match);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      current
                        ? "text-content after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary"
                        : "text-content-secondary hover:bg-surface-subtle hover:text-content",
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
            <li>
              <span
                className="flex h-11 cursor-not-allowed select-none items-center gap-1.5 px-3 text-sm font-medium text-content-muted"
                aria-disabled="true"
              >
                {t("vets")}
                <span className="rounded-sm bg-surface-subtle px-1.5 py-0.5 text-xs font-medium text-content-secondary">
                  {t("comingSoon")}
                </span>
              </span>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-[9rem] truncate text-sm text-content-secondary lg:inline">
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex h-11 items-center rounded-md px-2 text-sm font-medium text-content-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center rounded-md px-2 text-sm font-medium text-content-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("login")}
            </Link>
          )}
          <LocaleSwitcher />
        </div>
      </div>

      {/* 모바일 내비게이션. 좁은 폭에서 메뉴 전체가 사라지면 로고 말고는 이동할 길이 없다. */}
      <nav
        aria-label={t("primaryNav")}
        className="border-t border-border bg-surface md:hidden"
      >
        <ul className="flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const current = isCurrent(item.match);
            const Icon =
              item.labelKey === "places"
                ? MapPin
                : item.labelKey === "favorites"
                  ? Heart
                  : PawPrint;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 w-full items-center justify-center gap-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    current
                      ? "text-primary after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-primary"
                      : "text-content-secondary",
                  )}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
