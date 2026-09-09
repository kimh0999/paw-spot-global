import { cn } from "@/lib/utils";

/**
 * 반려견 아바타.
 *
 * 사진 업로드 기능이 없으므로 이미 가진 데이터(이름)만으로 서로 구분되게 만든다.
 * 모두 같은 발바닥 아이콘이면 목록에서 두 마리를 눈으로 구분할 수 없다.
 *
 * 색은 이름에서 결정론적으로 고르므로 새로고침해도 같은 아이에게 같은 색이 붙는다.
 * 상태 색(초록·앰버·빨강)과 섞이지 않도록 저채도 톤만 쓴다 — 아바타는 판정이 아니다.
 */
const TINTS = [
  "bg-primary-soft text-primary",
  "bg-avatar-cool text-avatar-cool-fg",
  "bg-avatar-clay text-avatar-clay-fg",
  "bg-surface-subtle text-content-secondary",
] as const;

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return TINTS[hash % TINTS.length];
}

interface DogAvatarProps {
  name: string;
  className?: string;
}

export default function DogAvatar({ name, className }: DogAvatarProps) {
  // 이름의 첫 글자. 한글 한 글자, 영문 한 글자 모두 자연스럽게 잡힌다.
  const initial = Array.from(name.trim())[0] ?? "";

  return (
    <span
      // 이름은 바로 옆에 글자로 적혀 있다. 아바타를 또 읽히게 하지 않는다.
      aria-hidden="true"
      className={cn(
        "flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full text-lg font-bold",
        tintFor(name),
        className,
      )}
    >
      {initial}
    </span>
  );
}
