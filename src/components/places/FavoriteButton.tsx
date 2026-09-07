"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { toggleFavorite } from "@/lib/favorites/actions";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  placeId: string;
  initialFavorite: boolean;
  className?: string;
}

export default function FavoriteButton({
  placeId,
  initialFavorite,
  className,
}: FavoriteButtonProps) {
  const t = useTranslations("places.selectedPlacePanel.favorite");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function redirectToLogin() {
    // 목록의 카테고리·필터·정렬은 주소에만 있다. 쿼리를 빼면 로그인 후 조건이 풀린 목록으로 돌아온다.
    const query = searchParams.toString();
    const path = pathname === "/" ? "" : pathname;
    const callbackUrl = `/${locale}${path}${query ? `?${query}` : ""}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  function handleClick() {
    if (status !== "authenticated") {
      redirectToLogin();
      return;
    }

    const next = !favorited;
    setFavorited(next);

    startTransition(async () => {
      const result = await toggleFavorite(placeId);
      if ("error" in result) {
        setFavorited(!next);
        redirectToLogin();
        return;
      }
      setFavorited(result.favorited);
    });
  }

  const label = favorited ? t("remove") : t("add");

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={label}
      aria-pressed={favorited}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border-strong text-content-muted transition-colors hover:text-content disabled:opacity-60",
        favorited && "border-primary text-primary hover:text-primary-hover",
        className,
      )}
    >
      <Heart
        className="w-4 h-4"
        aria-hidden="true"
        fill={favorited ? "currentColor" : "none"}
      />
    </button>
  );
}
