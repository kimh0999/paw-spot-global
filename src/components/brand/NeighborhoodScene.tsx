import { cn } from "@/lib/utils";

/**
 * 홈 히어로의 브랜드 장면.
 *
 * **장면의 의도**: 보호자와 반려견이 동네 골목을 함께 걷고, 그 길에 늘어선 가게들에는
 * 방문 조건이 이미 확인되어 핀으로 꽂혀 있다. 이 서비스가 다루는 것이 "장소 사진"이 아니라
 * "함께 갈 수 있는지 확인된 동네"라는 것을 한 장면으로 말한다.
 *
 * **그리는 규칙** (DESIGN.md §6 Neighborhood Scene)
 * - **시점을 하나로 고정한다.** 인물·반려견·가게 모두 옆면이며, 둘은 오른쪽으로 걷는다.
 *   앞모습 인물과 옆모습 반려견을 섞으면 같은 장면 안에 두 개의 시점이 생겨 정지 화면이 된다.
 * - **걸음은 자세로 만든다.** 앞다리와 뒷다리를 어긋나게 두고, 뒷발 뒤꿈치를 들고, 몸을
 *   진행 방향으로 약간 기울인다. 목줄은 손에서 목걸이까지 **끊기지 않고** 이어진다.
 * - **초점은 한 곳이다.** 대비가 가장 높은 것은 보호자와 반려견뿐이고, 가게·나무·지면은
 *   낮은 대비로 물러선다. 헤드라인과 검색이 먼저 읽혀야 하기 때문이다(§5 Home).
 * - **윤곽선을 쓰지 않는다.** 형태는 면과 명도로 구분한다. 선은 팔다리·목줄·바닥 이음매처럼
 *   실제로 가느다란 것에만 쓰고 굵기 체계를 섞지 않는다.
 * - **특정 매장을 그리지 않는다.** 가게는 카테고리를 암시하는 일반적인 파사드이며 실제
 *   장소의 외관·분위기를 나타내지 않는다(§2.1).
 * - 색은 일러스트 전용 토큰(`--color-scene-*`)과 브랜드·중립 토큰만 쓴다. 핀 안의 체크만
 *   `확인됨`을 뜻하는 상태 색을 쓴다 — 이 서비스의 어휘와 같은 뜻이기 때문이다.
 * - 내용은 옆의 문장이 모두 전달하므로 접근성 트리에서 제외한다.
 *
 * **좌표 기준선** — 좁은 폭의 크롭 규칙이 이 값에 걸려 있다.
 * - `y=258` 지면. 가게 바닥이 닿는 선.
 * - `y=300` 보도. 보호자와 반려견이 딛는 선이며 지면보다 앞이라 더 아래에 있다.
 * - `y=191` 보호자의 머리 끝. **크롭은 이 선 위에서 자르지 않는다.** 여유를 두어
 *   `y=176`을 안전선으로 잡으면 띠 비율 상한이 `520 / (340 - 176) ≈ 3.2:1`이 되고,
 *   §5 Home의 `sm:aspect-[16/5]`가 이 값이다.
 */

/** 어닝 한 조각. 위·아래 폭이 달라 사다리꼴이며, 조각으로 나눠야 줄무늬가 밖으로 안 샌다. */
function AwningStripe({ from, to, dark }: { from: number; to: number; dark: boolean }) {
  const topX = (t: number) => 34 + 122 * t;
  const bottomX = (t: number) => 42 + 106 * t;
  return (
    <path
      d={`M${topX(from)} 170 L${topX(to)} 170 L${bottomX(to)} 190 L${bottomX(from)} 190 Z`}
      className={dark ? "fill-primary" : "fill-primary-soft"}
      opacity={dark ? 0.26 : 1}
    />
  );
}

const AWNING_STRIPES = [0, 1, 2, 3, 4, 5];

export default function NeighborhoodScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 340"
      // 좁은 폭에서는 띠로 잘라 쓴다. 바닥을 기준으로 잘라 보도·인물·반려견이 남는다.
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-full", className)}
    >
      {/* 하늘 — 색면 하나. 위쪽을 비워 두어야 헤드라인 쪽으로 시선이 먼저 간다 */}
      <rect width="520" height="340" className="fill-scene-sky" />

      {/* --- 가게 세 채. 카테고리를 암시하는 일반적인 파사드다 --- */}

      {/* 카페 — 줄무늬 어닝. 인물 뒤가 아니라 옆이라 이 채에만 장식을 준다 */}
      <g>
        <rect x="30" y="150" width="130" height="108" rx="3" className="fill-surface" />
        <rect x="44" y="156" width="102" height="9" rx="4.5" className="fill-primary" opacity="0.16" />
        {AWNING_STRIPES.map((i) => (
          <AwningStripe key={i} from={i / 6} to={(i + 1) / 6} dark={i % 2 === 1} />
        ))}
        <rect x="48" y="210" width="26" height="48" rx="2" className="fill-surface-subtle" />
        <circle cx="68" cy="236" r="2" className="fill-content" opacity="0.22" />
        <rect x="88" y="200" width="56" height="40" rx="2" className="fill-avatar-cool" />
        <path d="M94 240 L122 200 H133 L105 240 Z" className="fill-surface" opacity="0.5" />
        <rect x="30" y="250" width="130" height="8" className="fill-content" opacity="0.05" />
      </g>

      {/* 식당 — 인물이 이 앞을 지난다. 초점을 뺏지 않도록 통유리 하나로 조용히 둔다 */}
      <g>
        <rect x="172" y="142" width="146" height="116" rx="3" className="fill-surface" />
        <rect x="172" y="142" width="146" height="14" rx="3" className="fill-avatar-clay" />
        <rect x="184" y="170" width="122" height="62" rx="2" className="fill-avatar-cool" opacity="0.65" />
        <path d="M245 170 V232" className="stroke-surface" strokeWidth="3" />
        <rect x="228" y="232" width="34" height="26" rx="2" className="fill-surface-subtle" />
        <rect x="172" y="250" width="146" height="8" className="fill-content" opacity="0.05" />
      </g>

      {/* 여행지 — 박공지붕 작은 집 */}
      <g>
        <path d="M322 180 L391 136 L460 180 Z" className="fill-primary-soft" />
        <path d="M391 136 L460 180 L391 180 Z" className="fill-primary" opacity="0.1" />
        <rect x="336" y="180" width="110" height="78" rx="2" className="fill-surface" />
        <circle cx="391" cy="204" r="11" className="fill-avatar-cool" />
        <rect x="376" y="224" width="30" height="34" rx="2" className="fill-surface-subtle" />
        <rect x="336" y="250" width="110" height="8" className="fill-content" opacity="0.05" />
      </g>

      {/* 오른쪽 가로수 — 줄기를 먼저 두고 잎이 덮는다 */}
      <g>
        <rect x="482" y="212" width="9" height="46" rx="4.5" className="fill-avatar-clay-fg" opacity="0.4" />
        <path
          d="M486 166 C506 166 520 180 518 196 C516 212 502 222 486 222 C470 222 456 212 454 196 C452 180 466 166 486 166 Z"
          className="fill-scene-leaf"
        />
        <path
          d="M486 222 C470 222 456 212 454 196 C462 205 473 210 486 210 Z"
          className="fill-content"
          opacity="0.05"
        />
      </g>

      {/* --- 보도 --- */}
      <rect y="258" width="520" height="82" className="fill-surface-subtle" />
      <path d="M0 258 H520" className="stroke-content" strokeWidth="2" opacity="0.07" />
      <path
        d="M44 320 h58 M148 325 h66 M284 324 h62 M400 320 h64"
        className="stroke-content"
        strokeWidth="2"
        opacity="0.05"
        strokeLinecap="round"
      />

      {/*
        --- 확인된 조건 핀. 가게 지붕에 닿을 만큼 내려와 그 가게의 표시로 읽힌다 ---

        높이를 `y=115` 아래로 맞춘 이유는 크롭이다. 좁은 폭에서 띠로 자르면 위가 잘리는데,
        핀이 그 선에 걸치면 꼭지만 남아 아무 뜻도 없는 조각이 된다. 잘릴 바에는 처음부터
        잘리지 않는 높이에 둔다(§5 Home 크롭 규칙).
      */}
      <g>
        <path
          d="M96 115 C88.2 115 82 121.2 82 129 C82 139.1 96 151.5 96 151.5 C96 151.5 110 139.1 110 129 C110 121.2 103.8 115 96 115 Z"
          className="fill-primary"
        />
        <circle cx="96" cy="128" r="6.2" className="fill-surface" />
        <path
          d="M93.35 127.2 l2.02 2.18 l4.05 -4.36"
          className="fill-none stroke-success"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g>
        <path
          d="M430 121 C422.8 121 417 126.8 417 134 C417 143.4 430 154.9 430 154.9 C430 154.9 443 143.4 443 134 C443 126.8 437.2 121 430 121 Z"
          className="fill-surface"
        />
        <path
          d="M430 121 C422.8 121 417 126.8 417 134 C417 143.4 430 154.9 430 154.9 C430 154.9 443 143.4 443 134 C443 126.8 437.2 121 430 121 Z"
          className="fill-none stroke-primary"
          strokeWidth="2"
        />
        <circle cx="430" cy="135.7" r="3.1" className="fill-primary" />
        <circle cx="425.7" cy="130.1" r="1.65" className="fill-primary" />
        <circle cx="430" cy="128.6" r="1.65" className="fill-primary" />
        <circle cx="434.3" cy="130.1" r="1.65" className="fill-primary" />
      </g>

      {/* --- 접지 그림자. 둘 다 같은 모양·같은 농도다 --- */}
      <ellipse cx="206" cy="303" rx="27" ry="4.5" className="fill-content" opacity="0.09" />
      <ellipse cx="298" cy="301" rx="30" ry="4.2" className="fill-content" opacity="0.09" />

      {/*
        목줄 — 손에서 목걸이까지 한 번에 이어진다. 반려견이 반 발 앞서 있어 살짝 당겨진
        곡선이며, 등 위를 지나가 몸에 걸치지 않는다. 목걸이보다 먼저 그려 끝이 목걸이
        아래로 들어가고, 그래야 매달린 것이 아니라 채워진 것으로 보인다.
      */}
      <path
        d="M236 250 Q279 264 321 262"
        className="fill-none stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* --- 보호자. 오른쪽으로 걷는 옆모습이다 --- */}
      <g>
        {/*
          먼 쪽 팔다리를 먼저, 조금 옅게 — 앞뒤 거리를 색이 아니라 농도로 만든다.
          너무 옅으면 다른 색의 옷으로 보이므로 같은 색으로 읽히는 선에서 멈춘다.
        */}
        <path
          d="M205 261 L195 279 L188 294"
          className="fill-none stroke-primary-hover"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        <rect
          x="180"
          y="291"
          width="17"
          height="7"
          rx="3.5"
          transform="rotate(14 188 294)"
          className="fill-primary-hover"
          opacity="0.75"
        />
        {/* 뒤로 젖힌 팔은 몸통 밖까지 빼야 걸음으로 읽힌다. 안쪽에 두면 등에 붙은 혹이 된다 */}
        <path
          d="M201 234 L191 246 L187 258"
          className="fill-none stroke-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.68"
        />
        <circle cx="186" cy="259" r="4.2" className="fill-scene-fur" opacity="0.68" />

        {/* 디딘 다리 — 무릎이 앞으로 나가고 발이 바닥에 붙는다 */}
        <path
          d="M209 261 L220 279 L224 295"
          className="fill-none stroke-primary-hover"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="219" y="295" width="19" height="7.5" rx="3.75" className="fill-primary-hover" />

        {/* 목 — 코트가 아랫부분을 덮는다 */}
        <rect x="202" y="211" width="9" height="12" className="fill-scene-fur" />

        {/* 코트 — 진행 방향으로 살짝 기울고 아래가 넓다 */}
        <path
          d="M197 232 Q198 223 207 220.5 Q217 220.5 218 231 L221 262 Q207 266 194 262 Z"
          className="fill-primary"
        />

        {/*
          목줄을 쥔 팔 — 어깨에서 손까지 한 줄로 이어지고 아래로 내려간다.
          수평으로 뻗으면 목줄을 쥔 것이 아니라 팔을 든 자세로 보인다.
        */}
        <path
          d="M213 232 L223 244 L233 250"
          className="fill-none stroke-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="234" cy="250" r="4.4" className="fill-scene-fur" />

        {/* 머리 — 옆모습. 시선은 진행 방향과 반려견 쪽으로 향한다 */}
        <circle cx="206" cy="203" r="12" className="fill-scene-fur" />
        {/* 코 — 옆모습이라는 것을 이 작은 돌출 하나가 정한다 */}
        <circle cx="218.4" cy="205.4" r="2.2" className="fill-scene-fur" />
        <circle cx="212.5" cy="203" r="1.7" className="fill-content" opacity="0.7" />
        <path
          d="M194 205 A12 12 0 0 1 217.6 200 Q210 202 203.5 204.6 Q197 207.2 194 205 Z"
          className="fill-content"
          opacity="0.75"
        />
      </g>

      {/*
        --- 반려견. 반 발 앞서 같은 방향으로 총총 걷는다 ---

        **크기 기준**: 어깨높이 34는 보호자 키(191→302, 111)의 약 30%로, 등이 보호자의
        무릎 언저리에 온다. 중형견의 실제 비율이며 이보다 키우면 반려견이 장면의 주인공을
        빼앗고 보호자가 아이처럼 보인다.
      */}
      <g>
        {/* 먼 쪽 두 다리 — 가까운 다리와 어긋나게 두어 걸음이 생긴다 */}
        <path
          d="M309 284 L303 300"
          className="fill-none stroke-scene-fur"
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.62"
        />
        <path
          d="M289 284 L294 300"
          className="fill-none stroke-scene-fur"
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.62"
        />

        {/* 몸통 — 뒤쪽 엉덩이를 둥글게 두어 원통이 아니라 개의 실루엣이 된다 */}
        <rect x="276" y="266" width="48" height="20" rx="10" className="fill-scene-fur" />
        <ellipse cx="287" cy="279" rx="11" ry="9" className="fill-scene-fur" />
        <circle cx="322" cy="276" r="10" className="fill-scene-fur" />

        {/* 가까운 두 다리 — 앞발은 내딛고 뒷발은 뒤로 뻗는다 */}
        <path
          d="M315 283 L320 300"
          className="fill-none stroke-scene-fur"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M284 283 L277 292 L273 300"
          className="fill-none stroke-scene-fur"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 목과 머리 — 등보다 높이 들려 앞을 본다 */}
        <path
          d="M317 274 L331 262"
          className="fill-none stroke-scene-fur"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <ellipse cx="348" cy="261" rx="8" ry="5.6" className="fill-scene-fur" />
        <circle cx="335" cy="258" r="10.5" className="fill-scene-fur" />
        <ellipse
          cx="328"
          cy="253"
          rx="4.6"
          ry="8.6"
          transform="rotate(-30 328 253)"
          className="fill-avatar-clay-fg"
          opacity="0.34"
        />
        <ellipse cx="354" cy="259.5" rx="2.6" ry="2" className="fill-content" opacity="0.75" />
        <path
          d="M350 264 q-3.5 2 -6.5 0.5"
          className="fill-none stroke-content"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.26"
        />
        <circle cx="338" cy="255" r="2" className="fill-content" opacity="0.75" />

        {/*
          꼬리 — 엉덩이 바깥에서 시작해 위로 감아 올린다. 굵기가 일정한 선으로 그리면
          끝이 뭉툭해 갈고리처럼 보이므로 뿌리에서 끝으로 가늘어지는 면으로 그린다.
          목줄보다 나중에 그려 앞을 지난다.
        */}
        <path
          d="M277 274 C265 273 257 265 259.5 252 C260.5 249.5 264 250 264 252.5 C262.5 263 269 268 278 268 Z"
          className="fill-scene-fur"
        />

        {/* 목걸이 — 목줄이 여기서 끝난다 */}
        <path
          d="M320.8 262.9 L328.6 271.9"
          className="fill-none stroke-primary"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
