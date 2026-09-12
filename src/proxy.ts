import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next 16에서 `middleware` 규약이 `proxy`로 바뀌었다. 파일 이름만 옮긴 것이 아니라
 * **런타임이 Edge에서 Node.js로 고정**된다(`proxy`는 runtime 설정을 받지 않는다).
 *
 * 이 파일이 하는 일은 next-intl의 로케일 협상뿐이다 — `auth()`를 부르지 않고
 * Node 내장 모듈도 쓰지 않으므로 런타임 변경의 영향이 없다. 저장소에 `runtime = "edge"`
 * 선언이 0건이고 배포 설정 파일도 없어 Edge를 유지해야 할 근거를 찾지 못했다.
 *
 * matcher와 협상 정책(NEXT_LOCALE 쿠키 → Accept-Language → defaultLocale)은 그대로다.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)" ],
};
