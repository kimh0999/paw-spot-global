"use client";

import { useState, useTransition } from "react";
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
  const router = useRouter();
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function redirectToLogin() {
    const callbackUrl = `/${locale}${pathname === "/" ? "" : pathname}`;
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
        "inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:opacity-60",
        favorited && "border-orange-300 text-orange-500 hover:border-orange-400 hover:text-orange-600",
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
