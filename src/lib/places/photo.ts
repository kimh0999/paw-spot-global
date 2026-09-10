/**
 * 사진 자리를 만들지 말지 정하는 단 하나의 판정.
 *
 * 카드·상세가 각자 `thumbnailUrl != null`로 판단하면, 예시 주소가 남아 있는 장소에서
 * 한쪽은 빈 자리를 만들고 한쪽은 만들지 않는다. 판정을 여기 한 곳에 둔다.
 */

/**
 * 명백한 예시 주소는 사진으로 치지 않는다.
 *
 * 시드·테스트 데이터에 `https://example.com`이 남아 있으면 요청이 응답도 실패도 하지 않고
 * 걸린 채로 남는다. 그러면 `onError`가 오지 않아 화면에는 빈 자리만 남는다.
 * 불러오기를 시도하기 전에 걸러 낸다.
 */
const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "example.net",
  "placeholder.com",
]);

/** 사진 자리를 만들 만한 주소인지. 거짓이면 그 화면에는 사진 자리 자체가 없다. */
export function hasUsablePhoto(src: string | null | undefined): src is string {
  if (!src) return false;
  try {
    const url = new URL(src, "http://localhost");
    return !PLACEHOLDER_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
