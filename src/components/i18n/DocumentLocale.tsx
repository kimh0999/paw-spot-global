"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * `<html lang>`을 현재 locale과 맞춘다.
 *
 * 루트 레이아웃이 `lang`을 서버에서 한 번 쓰는데, 언어 전환은 **클라이언트 이동**이라
 * 루트 레이아웃이 다시 렌더되지 않는다. 그래서 EN으로 바꿔도 문서는 `lang="ko"`로 남고,
 * 스크린리더가 영어 문장을 한국어 발음으로 읽는다.
 *
 * 새로고침 없이 고치는 가장 작은 방법이라 이 컴포넌트만 둔다 — 언어 전환을 전체 이동으로
 * 바꾸면 목록의 필터·선택 상태가 함께 날아간다.
 */
export default function DocumentLocale() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
