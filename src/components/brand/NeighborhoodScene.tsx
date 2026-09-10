import { cn } from "@/lib/utils";

/**
 * 홈 히어로의 브랜드 일러스트.
 *
 * **장면의 의도**: 보호자와 반려견이 동네 골목을 함께 걷고, 그 길에 늘어선 가게들에는
 * 방문 조건이 이미 확인되어 핀으로 꽂혀 있다. 이 서비스가 다루는 것이 "장소 사진"이 아니라
 * "함께 갈 수 있는지 확인된 동네"라는 것을 한 장면으로 말한다.
 *
 * 규칙:
 * - **특정 매장을 그리지 않는다.** 가게는 카테고리를 암시하는 일반적인 파사드이며
 *   실제 장소의 외관·분위기를 나타내지 않는다.
 * - 색은 일러스트 전용 토큰(`--color-scene-*`)과 브랜드·중립 토큰만 쓴다. 핀 안의 체크만
 *   `확인됨`을 뜻하는 상태 색을 쓴다 — 이 서비스의 어휘와 같은 뜻이기 때문이다.
 * - 내용은 옆의 문장이 모두 전달하므로 접근성 트리에서 제외한다.
 */

/** 어닝 한 조각. 위·아래 폭이 달라 사다리꼴이며, 조각으로 나눠 그려야 줄무늬가 밖으로 안 샌다. */
function AwningStripe({ from, to, dark }: { from: number; to: number; dark: boolean }) {
  const topX = (t: number) => 44 + 134 * t;
  const bottomX = (t: number) => 54 + 114 * t;
  return (
    <path
      d={`M${topX(from)} 150 L${topX(to)} 150 L${bottomX(to)} 174 L${bottomX(from)} 174 Z`}
      className={dark ? "fill-primary" : "fill-primary-soft"}
      opacity={dark ? 0.32 : 1}
    />
  );
}

export default function NeighborhoodScene({ className }: { className?: string }) {
  const stripes = [0, 1, 2, 3, 4, 5];

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
      {/* 하늘 — 부드러운 색면 하나로 장면의 안쪽을 만든다 */}
      <path d="M0 40 Q260 0 520 40 L520 268 L0 268 Z" className="fill-scene-sky" />

      {/* 먼 언덕 */}
      <path
        d="M0 214 Q92 168 190 210 Q286 250 380 206 Q452 172 520 208 L520 268 L0 268 Z"
        className="fill-scene-leaf"
        opacity="0.5"
      />

      {/* --- 가게 세 채. 카테고리를 암시하는 일반적인 파사드다 --- */}

      {/* 카페 — 줄무늬 어닝 */}
      <g>
        <rect x="52" y="150" width="118" height="108" rx="4" className="fill-surface" />
        <rect
          x="52"
          y="150"
          width="118"
          height="108"
          rx="4"
          className="fill-none stroke-content"
          strokeWidth="2"
          opacity="0.14"
        />
        {stripes.map((i) => (
          <AwningStripe key={i} from={i / 6} to={(i + 1) / 6} dark={i % 2 === 1} />
        ))}
        <path d="M54 174 H168" className="stroke-primary" strokeWidth="2" opacity="0.35" />
        <rect x="68" y="204" width="28" height="54" rx="2" className="fill-surface-subtle" />
        <circle cx="90" cy="232" r="2" className="fill-content" opacity="0.35" />
        <rect x="110" y="190" width="46" height="34" rx="2" className="fill-avatar-cool" />
        <path d="M110 207 H156" className="stroke-surface" strokeWidth="2" />
      </g>

      {/* 식당 — 넓은 통유리 */}
      <g>
        <rect x="182" y="116" width="138" height="142" rx="4" className="fill-avatar-clay" />
        <rect x="174" y="104" width="154" height="16" rx="5" className="fill-avatar-clay-fg" opacity="0.3" />
        <rect x="196" y="134" width="20" height="16" rx="2" className="fill-surface" opacity="0.8" />
        <rect x="226" y="134" width="20" height="16" rx="2" className="fill-surface" opacity="0.8" />
        <rect x="256" y="134" width="20" height="16" rx="2" className="fill-surface" opacity="0.8" />
        <rect x="286" y="134" width="20" height="16" rx="2" className="fill-surface" opacity="0.8" />
        <rect x="196" y="168" width="110" height="54" rx="3" className="fill-surface" />
        <path d="M251 168 V222" className="stroke-avatar-clay-fg" strokeWidth="2" opacity="0.25" />
        <rect x="228" y="222" width="34" height="36" rx="2" className="fill-avatar-clay-fg" opacity="0.35" />
      </g>

      {/* 공원 옆 작은 집 — 여행지 */}
      <g>
        <path d="M322 172 L382 134 L442 172 Z" className="fill-primary-soft" />
        <path
          d="M322 172 L382 134 L442 172"
          className="fill-none stroke-primary"
          strokeWidth="2"
          opacity="0.4"
        />
        <rect x="332" y="172" width="100" height="86" rx="3" className="fill-surface" />
        <rect
          x="332"
          y="172"
          width="100"
          height="86"
          rx="3"
          className="fill-none stroke-content"
          strokeWidth="2"
          opacity="0.14"
        />
        <circle cx="382" cy="196" r="13" className="fill-avatar-cool" />
        <rect x="368" y="222" width="28" height="36" rx="2" className="fill-surface-subtle" />
      </g>

      {/* 가로등 — 앞뒤 거리를 만든다 */}
      <g>
        <rect x="160" y="176" width="5" height="86" rx="2.5" className="fill-content" opacity="0.35" />
        <path d="M162 178 h20" className="stroke-content" strokeWidth="4" opacity="0.35" strokeLinecap="round" />
        <circle cx="184" cy="180" r="6" className="fill-warning" opacity="0.35" />
      </g>

      {/* 가로수 */}
      <g>
        <rect x="464" y="204" width="9" height="56" rx="4" className="fill-avatar-clay-fg" opacity="0.5" />
        <circle cx="468" cy="188" r="27" className="fill-scene-leaf" />
        <circle cx="449" cy="200" r="17" className="fill-scene-leaf" />
        <circle cx="487" cy="200" r="17" className="fill-scene-leaf" />
      </g>

      {/* --- 보도 --- */}
      <path d="M0 262 Q260 244 520 262 L520 340 L0 340 Z" className="fill-surface-subtle" />
      <path
        d="M0 262 Q260 244 520 262"
        className="fill-none stroke-content"
        strokeWidth="2"
        opacity="0.12"
      />
      <path
        d="M60 292 h48 M152 288 h48 M244 286 h48 M336 287 h48 M428 290 h48"
        className="stroke-content"
        strokeWidth="2"
        opacity="0.07"
        strokeLinecap="round"
      />

      {/* --- 확인된 조건 핀. 이 서비스가 길 위에 남겨 둔 표시다 --- */}
      <g>
        <path
          d="M100 92 C89 92 80 101 80 112 C80 126 100 144 100 144 C100 144 120 126 120 112 C120 101 111 92 100 92 Z"
          className="fill-primary"
        />
        <circle cx="100" cy="112" r="9" className="fill-surface" />
        <path
          d="M96 112 l3 3 l6 -6"
          className="fill-none stroke-success"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g>
        <path
          d="M386 62 C377 62 370 69 370 78 C370 89 386 104 386 104 C386 104 402 89 402 78 C402 69 395 62 386 62 Z"
          className="fill-surface"
        />
        <path
          d="M386 62 C377 62 370 69 370 78 C370 89 386 104 386 104 C386 104 402 89 402 78 C402 69 395 62 386 62 Z"
          className="fill-none stroke-primary"
          strokeWidth="2"
        />
        <circle cx="386" cy="80" r="4" className="fill-primary" />
        <circle cx="381" cy="73" r="2" className="fill-primary" />
        <circle cx="386" cy="71" r="2" className="fill-primary" />
        <circle cx="391" cy="73" r="2" className="fill-primary" />
      </g>

      {/* --- 보호자와 반려견 --- */}
      <ellipse cx="301" cy="284" rx="24" ry="5" className="fill-content" opacity="0.09" />
      <ellipse cx="378" cy="278" rx="32" ry="5" className="fill-content" opacity="0.09" />

      {/* 반려견 — 사람보다 앞서 걷는다 */}
      <g>
        {/* 꼬리 */}
        <path
          d="M348 232 q-17 -3 -17 -23"
          className="fill-none stroke-scene-fur"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x="348" y="226" width="48" height="26" rx="13" className="fill-scene-fur" />
        <rect x="353" y="248" width="7" height="24" rx="3.5" className="fill-scene-fur" />
        <rect x="366" y="248" width="7" height="24" rx="3.5" className="fill-scene-fur" />
        <rect x="379" y="248" width="7" height="24" rx="3.5" className="fill-scene-fur" />
        <rect x="389" y="248" width="7" height="24" rx="3.5" className="fill-scene-fur" />
        <circle cx="402" cy="222" r="15" className="fill-scene-fur" />
        {/* 늘어진 귀 */}
        <ellipse
          cx="391"
          cy="219"
          rx="7"
          ry="12"
          transform="rotate(-22 391 219)"
          className="fill-avatar-clay-fg"
          opacity="0.45"
        />
        {/* 주둥이 */}
        <ellipse cx="415" cy="227" rx="9" ry="6.5" className="fill-avatar-clay-fg" opacity="0.28" />
        <circle cx="422" cy="225" r="2.6" className="fill-content" />
        <circle cx="405" cy="218" r="2.2" className="fill-content" />
        {/* 목걸이 */}
        <rect x="386" y="233" width="17" height="5" rx="2.5" className="fill-primary" />
      </g>

      {/* 목줄 — 손에서 목걸이까지 이어진다 */}
      <path
        d="M327 218 Q356 206 388 232"
        className="fill-none stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 보호자 */}
      <g>
        <rect x="292" y="232" width="8" height="48" rx="4" className="fill-content" opacity="0.85" />
        <rect x="304" y="232" width="8" height="48" rx="4" className="fill-content" />
        <rect x="288" y="276" width="16" height="7" rx="3.5" className="fill-content" />
        <rect x="301" y="276" width="16" height="7" rx="3.5" className="fill-content" />
        {/* 코트 */}
        <path
          d="M301 190 c-12 0 -18 8 -18 19 v27 h36 v-27 c0 -11 -6 -19 -18 -19 z"
          className="fill-primary"
        />
        {/* 먼 팔 */}
        <path
          d="M286 204 l-4 20"
          className="fill-none stroke-primary-hover"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* 목줄을 쥔 팔 */}
        <path
          d="M316 204 l10 13"
          className="fill-none stroke-primary-hover"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="327" cy="218" r="4" className="fill-scene-fur" />
        <circle cx="301" cy="177" r="12.5" className="fill-scene-fur" />
        {/* 머리 — 위쪽 반원만 덮는다 */}
        <path d="M288.5 177 a12.5 12.5 0 0 1 25 0 z" className="fill-content" opacity="0.82" />
      </g>
    </svg>
  );
}
