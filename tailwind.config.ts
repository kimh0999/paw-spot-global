import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--color-border-strong)",
          // 테두리가 곧 컨트롤의 식별 정보인 곳에만 쓴다 (DESIGN.md §4 Border color usage).
          control: "var(--color-border-control)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "var(--color-canvas)",
        surface: {
          DEFAULT: "var(--color-surface)",
          subtle: "var(--color-surface-subtle)",
          page: "var(--color-background)",
        },
        content: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        overlay: "var(--color-overlay)",
        avatar: {
          cool: "var(--color-avatar-cool)",
          "cool-fg": "var(--color-avatar-cool-fg)",
          clay: "var(--color-avatar-clay)",
          "clay-fg": "var(--color-avatar-clay-fg)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
          foreground: "var(--color-on-primary)",
        },
        unknown: {
          DEFAULT: "var(--color-unknown)",
          soft: "var(--color-unknown-soft)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--color-primary-hover)",
          soft: "var(--color-primary-soft)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          soft: "var(--color-success-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          soft: "var(--color-warning-soft)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      // 라틴 → 한글 순으로 얹는다. 브라우저는 글자마다 지원하는 첫 폰트를 고르므로
      // 영문은 Inter, 한글은 Noto Sans KR이 렌더된다.
      fontFamily: {
        sans: [
          "var(--font-latin)",
          "var(--font-korean)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
      // 값이 아니라 **역할**로 고른다 (DESIGN.md §4 Radius).
      // lg/md/sm은 컨트롤 계열이고, card/panel/sheet는 표면 계열이다.
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        sheet: "var(--radius-sheet)",
      },
      // 한국어는 같은 크기에서 라틴 문자보다 행간이 더 필요하다. 본문 계열의 leading을
      // Tailwind 기본값보다 넉넉하게 잡는다 (DESIGN.md §4 Typography).
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.625rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
      },
      // Radix는 닫힐 때 CSS **애니메이션**이 돌고 있으면 언마운트를 미룬다(transition으로는
      // 안 된다). 그래서 퇴장 모션이 필요한 곳은 keyframes로 정의한다.
      // 중앙 정렬 다이얼로그는 `-translate-x/y-1/2`로 위치를 잡으므로, keyframe의 transform이
      // 그 정렬을 덮어쓰지 않도록 translate를 함께 넣는다.
      keyframes: {
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "overlay-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "dialog-in": {
          from: { opacity: "0", transform: "translate(-50%, -50%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -50%) scale(0.97)" },
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(100%)" },
        },
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "drawer-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "popover-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "popover-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
      },
      animation: {
        "overlay-in": "overlay-in var(--duration-standard) var(--ease-enter)",
        "overlay-out": "overlay-out var(--duration-standard) var(--ease-exit)",
        "dialog-in": "dialog-in var(--duration-standard) var(--ease-enter)",
        "dialog-out": "dialog-out var(--duration-standard) var(--ease-exit)",
        "sheet-in": "sheet-in var(--duration-standard) var(--ease-enter)",
        "sheet-out": "sheet-out var(--duration-standard) var(--ease-exit)",
        "drawer-in": "drawer-in var(--duration-standard) var(--ease-enter)",
        "drawer-out": "drawer-out var(--duration-standard) var(--ease-exit)",
        "popover-in": "popover-in var(--duration-fast) var(--ease-enter)",
        "popover-out": "popover-out var(--duration-fast) var(--ease-exit)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        standard: "var(--duration-standard)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        enter: "var(--ease-enter)",
        exit: "var(--ease-exit)",
      },
      zIndex: {
        "map-control": "var(--z-map-control)",
        dropdown: "var(--z-dropdown)",
        header: "var(--z-header)",
        drawer: "var(--z-drawer)",
        "bottom-sheet": "var(--z-bottom-sheet)",
        dialog: "var(--z-dialog)",
        snackbar: "var(--z-snackbar)",
        tooltip: "var(--z-tooltip)",
      },
    },
  },
  plugins: [],
};

export default config;
