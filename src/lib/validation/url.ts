import { z } from "zod";

/**
 * 밖으로 나가는 링크는 http/https만 받는다.
 *
 * `z.string().url()`은 **스킴을 보지 않는다.** 설치된 zod 4.4.3에서
 * `javascript:alert(1)`·`data:text/html,...`·`vbscript:`·`file:///`이 모두 통과한다
 * (`new URL()`이 던지지 않으면 통과시키기 때문이다). 이 값들은 장소·병원 상세에서
 * 그대로 `href`에 들어가므로, 저장 단계에서 스킴을 막는 곳이 여기 한 곳이어야 한다.
 *
 * `z.httpUrl()`은 스킴과 함께 **호스트 형식도** 제한한다. 그래서 `https://localhost:3000`,
 * `https://192.168.0.1`, `https://exa_mple.com`은 거절된다. 이 서비스가 저장하는 값은
 * 가게·병원의 공개 홈페이지 주소라 도메인이 아닌 주소를 받을 이유가 없고,
 * 내부망 주소를 저장하지 못하는 쪽이 오히려 맞다.
 *
 * 최대 길이는 두지 않는다. 기존 `z.string().url()`에도 없었고, 이번 변경은
 * 스킴만 좁히는 것이 목적이다.
 */
export const httpUrlSchema = z.httpUrl();

/**
 * 선택 입력용. 폼은 빈 칸을 `""`로 보내고 DB는 `NULL`을 돌려준다.
 *
 * 동물병원 스키마의 `optionalText`와 입출력이 같다 — 앞뒤 공백을 떼고, `""`는 `null`로
 * 바꾸고, `null`을 받는다. 여기에 http/https 검사만 더했다.
 */
export const optionalHttpUrlText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .pipe(httpUrlSchema.nullable());

/**
 * 이미 저장된 값을 화면에서 링크로 만들어도 되는지.
 *
 * 스키마를 고치기 전에 들어간 행과 `scripts/import-places.mjs`로 들어온 행이 있어서,
 * DB에 http/https가 아닌 값이 남아 있을 수 있다. 운영 데이터를 고치지 않고도
 * 위험한 링크가 눌리지 않게 하려면 출력 쪽에도 같은 판정이 필요하다.
 *
 * 돌려주는 값은 스키마가 다듬은 결과(앞뒤 공백 제거)다. 통과하지 못하면 `null`이고,
 * 호출부는 링크 자체를 만들지 않는다.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = httpUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
